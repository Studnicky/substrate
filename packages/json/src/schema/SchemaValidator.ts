/**
 * SchemaValidator — schema-as-source-of-truth runtime validation.
 *
 * Compiles a JSON Schema 2020-12 document into a reusable type-guard predicate
 * backed by Ajv. Entities declare a single `Schema` (`as const satisfies
 * JSONSchema`) and derive both their compile-time `Type`
 * (via `FromSchema`) and their runtime `validate` guard from it — there is no
 * second, hand-written validator to drift out of sync.
 *
 * `compileIntake` parses data from outside the codebase; `compileCreate` builds
 * object entities from trusted data. Running transforms over your own fixture is
 * wrong; skipping them on a request body is worse. Intake therefore fills defaults
 * and strips unknown properties, while create only fills defaults — neither coerces
 * a scalar's type; a mismatch is rejected, not silently converted. Intake applies to
 * every entity, including scalar schemas; create is restricted to object entities
 * because a partial scalar is not meaningful.
 *
 * Subclass and override `protected static` hooks to customise compilation or
 * error rendering.
 *
 * @module
 */
import type { ErrorObject, ValidateFunction } from 'ajv';

import { BoundaryCycleGuard } from '@studnicky/intake-kit';
import { JsonObject, JsonValue, Predicates } from '@studnicky/types';

import type { SchemaCreateFunctionInterface } from '../interfaces/SchemaCreateFunctionInterface.js';
import type { SchemaIntakeFunctionInterface } from '../interfaces/SchemaIntakeFunctionInterface.js';

import { SchemaIntakeError } from '../errors/SchemaIntakeError.js';
import { AjvInstance } from './AjvInstance.js';

export class SchemaValidator {
  /**
   * Compiles `schema` into a type-guard predicate. The returned function
   * narrows `unknown` to `TValidated` and carries Ajv's `.errors` array after
   * each call, so callers needing detail can pair it with {@link formatErrors}.
   *
   * Compile once at module load and reuse; compilation is the expensive step.
   *
   * Idempotent for schemas carrying an `$id` — Ajv throws if the same `$id` is
   * added twice on one instance, which a bundler's module graph can trigger
   * (e.g. a dev server re-evaluating a module without disposing the previous
   * instance), so an already-registered `$id` returns the existing compiled
   * validator instead of recompiling.
   */
  public static compile<TValidated>(schema: object): ValidateFunction<TValidated> {
    const id: unknown = Reflect.get(schema, '$id');

    if (Predicates.isString(id)) {
      const existing = AjvInstance.assert.getSchema<TValidated>(id);
      if (existing !== undefined) {
        return existing;
      }
    }

    const validate = AjvInstance.assert.compile<TValidated>(schema);
    // The returned function is already a `(data) => data is TValidated` type guard
    // and carries Ajv's `.errors` after each call — consumers export it directly.
    return validate;
  }

  /**
   * Compiles `schema` into an untrusted-input parser. The parser clones input
   * before Ajv applies intake transforms, leaving the caller's value unchanged.
   *
   * Cyclic values are rejected before cloning because JSON Schema models JSON
   * trees rather than object graphs. Scalar values are never coerced — a `"true"`
   * string for a `boolean` field is rejected, not silently accepted as `true`.
   */
  public static compileIntake<TValidated>(schema: object): SchemaIntakeFunctionInterface<TValidated> {
    const id: unknown = Reflect.get(schema, '$id');
    const existing = Predicates.isString(id) ? AjvInstance.intake.getSchema<TValidated>(id) : undefined;
    const validate = existing ?? AjvInstance.intake.compile<TValidated>(schema);
    const schemaIdentifier = SchemaValidator.schemaIdentifier(schema);

    const intake: SchemaIntakeFunctionInterface<TValidated> = (input) => {
      if (SchemaValidator.hasCloneCycle(input)) {
        throw new SchemaIntakeError('cyclic input is not supported', [], schemaIdentifier);
      }
      const cleaned = SchemaValidator.stripUndefinedProperties(input);
      if (!JsonValue.is(cleaned)) {
        throw new SchemaIntakeError(SchemaValidator.formatJsonValidityErrors(cleaned), [], schemaIdentifier);
      }

      let cloned: unknown;
      try {
        cloned = structuredClone(cleaned);
      } catch {
        throw new SchemaIntakeError('input is not structured-cloneable', [], schemaIdentifier);
      }
      if (!validate(cloned)) {
        const errors = validate.errors ?? [];
        throw new SchemaIntakeError(SchemaValidator.formatErrors(errors), errors, schemaIdentifier);
      }

      return cloned;
    };

    return intake;
  }

  /**
   * Compiles `schema` into a trusted-data factory that fills schema defaults
   * without coercing values or removing properties.
   */
  public static compileCreate<TValidated extends Record<string, unknown>>(
    schema: object
  ): SchemaCreateFunctionInterface<TValidated> {
    const id: unknown = Reflect.get(schema, '$id');
    const existing = Predicates.isString(id) ? AjvInstance.create.getSchema<TValidated>(id) : undefined;
    const validate = existing ?? AjvInstance.create.compile<TValidated>(schema);
    const schemaIdentifier = SchemaValidator.schemaIdentifier(schema);

    const create: SchemaCreateFunctionInterface<TValidated> = (partial = {}) => {
      const cloned = structuredClone(partial);
      if (!validate(cloned)) {
        const errors = validate.errors ?? [];
        throw new SchemaIntakeError(SchemaValidator.formatErrors(errors), errors, schemaIdentifier);
      }

      return cloned;
    };

    return create;
  }

  /**
   * Renders an Ajv error array into a single human-readable line. Returns a
   * stable fallback when the array is empty, `null`, or `undefined`.
   */
  public static formatErrors(errors: Readonly<readonly ErrorObject[]> | null | undefined): string {
    if (errors === null || errors === undefined || errors.length === 0) {
      return 'invalid payload';
    }

    const result = errors.map(SchemaValidator.formatError).join('; ');
    return result;
  }

  /** Renders a single Ajv error object. Override to customise per-error wording. */
  protected static formatError(error: Readonly<ErrorObject>): string {
    const result = SchemaValidator.formatPathMessage(error.instancePath, error.message ?? 'invalid');
    return result;
  }

  /** Renders JSON-validity errors using the same path convention as Ajv errors. */
  protected static formatJsonValidityErrors(value: unknown): string {
    const messages = SchemaValidator.collectJsonValidityErrors(value);
    const result = messages.join('; ');
    return result;
  }

  /** Finds every non-JSON value in a finite, acyclic candidate. */
  protected static collectJsonValidityErrors(value: unknown, path = ''): string[] {
    if (value === null || Predicates.isString(value) || Predicates.isBoolean(value)) {
      return [];
    }
    if (Predicates.isNumberType(value)) {
      const message = Number.isFinite(value) ? undefined : SchemaValidator.describeInvalidJsonNumber(value);
      const result = message === undefined ? [] : [SchemaValidator.formatPathMessage(path, message)];
      return result;
    }
    if (Predicates.isArray(value)) {
      const messages: string[] = [];
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        const item: unknown = value.at(index);
        messages.push(...SchemaValidator.collectJsonValidityErrors(item, `${path}/${index}`));
      }
      return messages;
    }
    if (JsonObject.is(value)) {
      const messages: string[] = [];
      const keys = Object.keys(value);
      const length = keys.length;
      for (let index = 0; index < length; index += 1) {
        const key = keys[index]!;
        const item: unknown = Reflect.get(value, key);
        const nextPath = `${path}/${SchemaValidator.escapeJsonPointerSegment(key)}`;
        messages.push(...SchemaValidator.collectJsonValidityErrors(item, nextPath));
      }
      return messages;
    }

    return [SchemaValidator.formatPathMessage(path, `${typeof value} is not valid JSON data`)];
  }

  /** Formats a message at a JSON Pointer path, substituting the root label when needed. */
  protected static formatPathMessage(path: string, message: string): string {
    const formattedPath = path !== '' ? path : '(root)';

    return `${formattedPath}: ${message}`;
  }

  /** Escapes one property segment according to RFC 6901. */
  protected static escapeJsonPointerSegment(segment: string): string {
    const result = segment.replaceAll('~', '~0').replaceAll('/', '~1');
    return result;
  }

  /** Describes a non-finite number without exposing a JavaScript implementation detail. */
  protected static describeInvalidJsonNumber(value: number): string {
    if (Number.isNaN(value)) {
      return 'NaN is not valid JSON data';
    }
    const result = value < 0 ? '-Infinity is not valid JSON data' : 'Infinity is not valid JSON data';
    return result;
  }

  /** Finds the schema label carried by intake errors. */
  protected static schemaIdentifier(schema: object): string | undefined {
    const id: unknown = Reflect.get(schema, '$id');
    if (Predicates.isString(id)) {
      return id;
    }

    const title: unknown = Reflect.get(schema, 'title');
    const result = Predicates.isString(title) ? title : undefined;
    return result;
  }

  /**
   * Detects cycles that `Clone.deep` would recurse through.
   *
   * Delegates to `@studnicky/intake-kit`'s `BoundaryCycleGuard` — the same `Array`/`Map`/`Set`
   * /plain-object `WeakSet` walk this method used to hand-roll, shared with
   * `@studnicky/errors`' `EntityIntake.clone` so the two packages' intake engines don't drift.
   */
  protected static hasCloneCycle(value: unknown, ancestors = new WeakSet<object>()): boolean {
    const result = BoundaryCycleGuard.hasCycle(value, ancestors);
    return result;
  }

  /** Strips undefined properties recursively. */
  protected static stripUndefinedProperties(value: unknown): unknown {
    if (!Predicates.isObjectLike(value)) {
      const result = value;
      return result;
    }
    if (Array.isArray(value)) {
      const mapped = value.map(SchemaValidator.stripUndefinedProperties);
      return mapped;
    }
    const result: Record<string, unknown> = {};
    const keys = Object.keys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]!;
      const item: unknown = Reflect.get(value, key);
      if (item !== undefined) {
        Reflect.set(result, key, SchemaValidator.stripUndefinedProperties(item));
      }
    }
    const returnValue = result;
    return returnValue;
  }
}
