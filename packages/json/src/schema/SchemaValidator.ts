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
 * wrong; skipping them on a request body is worse. Intake therefore coerces,
 * fills defaults, and strips unknown properties, while create only fills defaults.
 * Intake applies to every entity, including scalar schemas; create is restricted
 * to object entities because a partial scalar is not meaningful.
 *
 * Subclass and override `protected static` hooks to customise compilation or
 * error rendering.
 *
 * @module
 */
import type { ErrorObject, ValidateFunction } from 'ajv';

import type { SchemaCreateFunctionInterface } from '../interfaces/SchemaCreateFunctionInterface.js';
import type { SchemaIntakeFunctionInterface } from '../interfaces/SchemaIntakeFunctionInterface.js';

import { SchemaIntakeError } from '../errors/SchemaIntakeError.js';
import { Clone } from '../json/Clone.js';
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

    if (typeof id === 'string') {
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
   * Cyclic values are rejected before cloning: `Clone.deep` intentionally has no
   * reference tracking, so rejecting cycles prevents recursive cloning from
   * overflowing the stack while JSON Schema continues to model JSON trees.
   */
  public static compileIntake<TValidated>(schema: object): SchemaIntakeFunctionInterface<TValidated> {
    const id: unknown = Reflect.get(schema, '$id');
    const existing = typeof id === 'string' ? AjvInstance.intake.getSchema<TValidated>(id) : undefined;
    const validate = existing ?? AjvInstance.intake.compile<TValidated>(schema);
    const schemaIdentifier = SchemaValidator.schemaIdentifier(schema);

    const intake: SchemaIntakeFunctionInterface<TValidated> = (input) => {
      if (SchemaValidator.hasCloneCycle(input)) {
        throw new SchemaIntakeError('cyclic input is not supported', [], schemaIdentifier);
      }

      const cloned = Clone.deep(input);
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
    const existing = typeof id === 'string' ? AjvInstance.create.getSchema<TValidated>(id) : undefined;
    const validate = existing ?? AjvInstance.create.compile<TValidated>(schema);
    const schemaIdentifier = SchemaValidator.schemaIdentifier(schema);

    const create: SchemaCreateFunctionInterface<TValidated> = (partial = {}) => {
      const cloned = Clone.deep(partial);
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
    const path = error.instancePath !== '' ? error.instancePath : '(root)';

    return `${path}: ${error.message ?? 'invalid'}`;
  }

  /** Finds the schema label carried by intake errors. */
  protected static schemaIdentifier(schema: object): string | undefined {
    const id: unknown = Reflect.get(schema, '$id');
    if (typeof id === 'string') {
      return id;
    }

    const title: unknown = Reflect.get(schema, 'title');
    const result = typeof title === 'string' ? title : undefined;
    return result;
  }

  /** Detects cycles that `Clone.deep` would recurse through. */
  protected static hasCloneCycle<T>(value: T, ancestors = new WeakSet<object>()): boolean {
    if (value === null || typeof value !== 'object') {
      return false;
    }
    if (ancestors.has(value)) {
      return true;
    }

    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        const result = value.some((item) => {
          const hasCycle = SchemaValidator.hasCloneCycle(item, ancestors);
          return hasCycle;
        });
        return result;
      }
      if (value instanceof Map) {
        for (const [key, item] of value.entries()) {
          if (SchemaValidator.hasCloneCycle(key, ancestors) || SchemaValidator.hasCloneCycle(item, ancestors)) {
            return true;
          }
        }
        return false;
      }
      if (value instanceof Set) {
        for (const item of value.values()) {
          if (SchemaValidator.hasCloneCycle(item, ancestors)) {
            return true;
          }
        }
        return false;
      }

      const result = Object.values(value).some((item) => {
        const hasCycle = SchemaValidator.hasCloneCycle(item, ancestors);
        return hasCycle;
      });
      return result;
    } finally {
      ancestors.delete(value);
    }
  }
}
