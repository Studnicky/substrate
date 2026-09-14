/**
 * EntityCompiler — schema-as-source-of-truth runtime validation.
 *
 * Compiles a JSON Schema 2020-12 document into a reusable type-guard predicate
 * backed by Ajv. Entities declare a single `Schema` (`as const satisfies
 * JSONSchema`) and derive both their compile-time `Type`
 * (via `FromSchema`) and their runtime `validate` guard from it — there is no
 * second, hand-written validator to drift out of sync.
 *
 * `compileIntake` parses data from outside the codebase; `compileCreate` builds
 * object entities from trusted data. Both fill schema defaults and validate the
 * cloned value according to its schema. Neither coerces a scalar's type; a
 * mismatch is rejected. Intake applies to
 * every entity, including scalar schemas; create is restricted to object entities
 * because a partial scalar is not meaningful.
 *
 * @module
 */
import { JsonObject, JsonValue, Predicates } from '@studnicky/types/node';

import type { EntityCreateFunctionInterface } from './interfaces/EntityCreateFunctionInterface.js';
import type { EntityIntakeFunctionInterface } from './interfaces/EntityIntakeFunctionInterface.js';
import type { EntityValidateFunctionInterface } from './interfaces/EntityValidateFunctionInterface.js';
import type { EntityValidationErrorInterface } from './interfaces/EntityValidationErrorInterface.js';

import { EntityAjvInstance } from './EntityAjvInstance.js';
import { SchemaIntakeError } from './SchemaIntakeError.js';

interface SchemaRegistryInterface {
  readonly 'compile': <TValidated>(schema: object) => EntityValidateFunctionInterface<TValidated>;
  readonly 'getSchema': <TValidated>(key: string) => EntityValidateFunctionInterface<TValidated> | undefined;
}

export class EntityCompiler {
  /**
   * Compiles `schema` into a type-guard predicate. The returned function
   * narrows `unknown` to `TValidated` and carries Ajv's `.errors` array after
   * each call, so callers needing detail can pair it with {@link formatErrors}.
   *
   * Compile once at module load and reuse; compilation is the expensive step.
   */
  public static compile<TValidated>(schema: object): EntityValidateFunctionInterface<TValidated> {
    const id = EntityCompiler.schemaId(schema);
    if (id !== undefined) {
      const existing = EntityAjvInstance.assert.getSchema<TValidated>(id);
      if (existing !== undefined) {
        return existing;
      }
    }
    const result = EntityAjvInstance.assert.compile<TValidated>(schema);
    return result;
  }

  /**
   * Compiles `schema` into an untrusted-input parser. The parser clones input
   * before Ajv applies schema defaults, leaving the caller's value unchanged.
   *
   * Cyclic values are rejected before cloning because JSON Schema models JSON
   * trees rather than object graphs. Scalar values are never coerced — a `"true"`
   * string for a `boolean` field is rejected, not silently accepted as `true`.
   */
  public static compileIntake<TValidated>(schema: object): EntityIntakeFunctionInterface<TValidated> {
    const validate = EntityCompiler.schemaValidator<TValidated>(EntityAjvInstance.intake, schema);
    const schemaIdentifier = EntityCompiler.schemaIdentifier(schema);
    const intake: EntityIntakeFunctionInterface<TValidated> = (input) => {
      if (Predicates.hasCycle(input)) {
        throw new SchemaIntakeError('cyclic input is not supported', [], schemaIdentifier);
      }
      const normalized = EntityCompiler.omitUndefinedDeclaredProperties(input, schema);
      if (!JsonValue.is(normalized)) {
        throw new SchemaIntakeError(EntityCompiler.formatJsonValidityErrors(normalized), [], schemaIdentifier);
      }
      let cloned: unknown;
      try {
        cloned = structuredClone(normalized);
      } catch {
        throw new SchemaIntakeError('input is not structured-cloneable', [], schemaIdentifier);
      }
      if (!validate(cloned)) {
        const errors = validate.errors ?? [];
        throw new SchemaIntakeError(EntityCompiler.formatErrors(errors), errors, schemaIdentifier);
      }
      return cloned;
    };
    return intake;
  }

  /**
   * Compiles `schema` into a trusted-data factory that fills schema defaults
   * without coercing values or removing properties.
   */
  public static compileCreate<TValidated extends object>(
    schema: object
  ): EntityCreateFunctionInterface<TValidated> {
    const validate = EntityCompiler.schemaValidator<TValidated>(EntityAjvInstance.create, schema);
    const schemaIdentifier = EntityCompiler.schemaIdentifier(schema);
    const create: EntityCreateFunctionInterface<TValidated> = (partial = {}) => {
      const cloned = structuredClone(partial);
      if (!validate(cloned)) {
        const errors = validate.errors ?? [];
        throw new SchemaIntakeError(EntityCompiler.formatErrors(errors), errors, schemaIdentifier);
      }
      return cloned;
    };
    return create;
  }

  /**
   * Renders an Ajv error array into a single human-readable line. Returns a
   * stable fallback when the array is empty, `null`, or `undefined`.
   */
  public static formatErrors(errors: Readonly<readonly EntityValidationErrorInterface[]> | null | undefined): string {
    if (errors === null || errors === undefined || errors.length === 0) {
      return 'invalid payload';
    }

    const result = errors.map(EntityCompiler.formatError).join('; ');
    return result;
  }

  /** Renders a single Ajv error object. */
  private static formatError(error: Readonly<EntityValidationErrorInterface>): string {
    const result = EntityCompiler.formatPathMessage(error.instancePath, error.message ?? 'invalid');
    return result;
  }

  /** Renders JSON-validity errors using the same path convention as Ajv errors. */
  private static formatJsonValidityErrors(value: unknown): string {
    const messages = EntityCompiler.collectJsonValidityErrors(value);
    const result = messages.join('; ');
    return result;
  }

  /** Finds every non-JSON value in a finite, acyclic candidate. */
  private static collectJsonValidityErrors(value: unknown, path = ''): string[] {
    if (value === null || Predicates.isString(value) || Predicates.isBoolean(value)) {
      return [];
    }
    if (Predicates.isNumberType(value)) {
      const message = Number.isFinite(value) ? undefined : EntityCompiler.describeInvalidJsonNumber(value);
      const result = message === undefined ? [] : [EntityCompiler.formatPathMessage(path, message)];
      return result;
    }
    if (Predicates.isArray(value)) {
      const messages: string[] = [];
      const length = value.length;
      for (let index = 0; index < length; index += 1) {
        const item: unknown = value.at(index);
        messages.push(...EntityCompiler.collectJsonValidityErrors(item, `${path}/${index}`));
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
        const escapedKey = key.replaceAll('~', '~0').replaceAll('/', '~1');
        const nextPath = `${path}/${escapedKey}`;
        messages.push(...EntityCompiler.collectJsonValidityErrors(item, nextPath));
      }
      return messages;
    }

    return [EntityCompiler.formatPathMessage(path, `${typeof value} is not valid JSON data`)];
  }

  /** Formats a message at a JSON Pointer path, substituting the root label when needed. */
  private static formatPathMessage(path: string, message: string): string {
    const formattedPath = path !== '' ? path : '(root)';

    return `${formattedPath}: ${message}`;
  }

  /** Describes a non-finite number without exposing a JavaScript implementation detail. */
  private static describeInvalidJsonNumber(value: number): string {
    if (Number.isNaN(value)) {
      return 'NaN is not valid JSON data';
    }
    const result = value < 0 ? '-Infinity is not valid JSON data' : 'Infinity is not valid JSON data';
    return result;
  }

  /** Finds the schema label carried by intake errors. */
  private static schemaIdentifier(schema: object): string | undefined {
    const id: unknown = Reflect.get(schema, '$id');
    if (Predicates.isString(id)) {
      return id;
    }

    const title: unknown = Reflect.get(schema, 'title');
    const result = Predicates.isString(title) ? title : undefined;
    return result;
  }

  /** Omits explicit undefined values only for properties the schema declares. */
  private static omitUndefinedDeclaredProperties(value: unknown, schema: object): unknown {
    if (Predicates.isArray(value)) {
      const itemSchema = EntityCompiler.getSchemaObjectMember(schema, 'items');
      if (itemSchema === undefined) {
        const result = value;
        return result;
      }
      const result = value.map((item) => {
        const itemResult = EntityCompiler.omitUndefinedDeclaredProperties(item, itemSchema);
        return itemResult;
      });
      return result;
    }
    if (!Predicates.isRecord(value)) {
      const result = value;
      return result;
    }
    const properties = EntityCompiler.getSchemaObjectMember(schema, 'properties');
    const patternProperties = EntityCompiler.getSchemaObjectMember(schema, 'patternProperties');
    if (properties === undefined && patternProperties === undefined) {
      const result = value;
      return result;
    }
    const result: Record<string, unknown> = {};
    const keys = Object.keys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]!;
      const item = Reflect.get(value, key);
      const directPropertySchema = properties === undefined
        ? undefined
        : EntityCompiler.getSchemaObjectMember(properties, key);
      const propertySchema = directPropertySchema ?? EntityCompiler.getPatternPropertySchema(patternProperties, key);
      if (propertySchema === undefined) {
        Reflect.set(result, key, item);
        continue;
      }
      if (item === undefined) {
        continue;
      }
      Reflect.set(result, key, EntityCompiler.omitUndefinedDeclaredProperties(item, propertySchema));
    }
    return result;
  }

  /** Finds an object-valued pattern schema that declares a property name. */
  private static getPatternPropertySchema(
    patternProperties: Record<string, unknown> | undefined,
    propertyName: string
  ): Record<string, unknown> | undefined {
    if (patternProperties === undefined) {
      return undefined;
    }
    const patterns = Object.keys(patternProperties);
    for (let index = 0; index < patterns.length; index += 1) {
      const pattern = patterns[index]!;
      const patternSchema = EntityCompiler.getSchemaObjectMember(patternProperties, pattern);
      if (patternSchema === undefined) {
        continue;
      }
      const expression = new RegExp(pattern, 'u');
      if (expression.test(propertyName)) {
        return patternSchema;
      }
    }
    return undefined;
  }

  /** Returns an object-valued schema member when it is present. */
  private static getSchemaObjectMember(schema: object, key: string): Record<string, unknown> | undefined {
    const member: unknown = Reflect.get(schema, key);
    const result = Predicates.isRecord(member) ? member : undefined;
    return result;
  }

  private static schemaValidator<TValidated>(
    registry: SchemaRegistryInterface,
    schema: object
  ): EntityValidateFunctionInterface<TValidated> {
    const id = EntityCompiler.schemaId(schema);
    if (id !== undefined) {
      const existing = registry.getSchema<TValidated>(id);
      if (existing !== undefined) {
        return existing;
      }
    }
    const result = registry.compile<TValidated>(schema);
    return result;
  }

  private static schemaId(schema: object): string | undefined {
    const id: unknown = Reflect.get(schema, '$id');
    const result = Predicates.isString(id) ? id : undefined;
    return result;
  }
}
