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
  private static readonly patternPropertyValidators = new WeakMap<object, Map<string, EntityValidateFunctionInterface<Record<string, null>>>>();
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

  /** Omits explicit undefined values only for optional properties the schema declares. */
  private static omitUndefinedDeclaredProperties(
    value: unknown,
    schema: object,
    rootSchema: object = schema
  ): unknown {
    if (Predicates.isArray(value)) {
      const itemSchemas = EntityCompiler.itemSchemas(schema, rootSchema, new Set<string>());
      if (itemSchemas.length === 0) {
        const result = value;
        return result;
      }
      const result = value.map((item) => {
        let normalized = item;
        const schemaCount = itemSchemas.length;
        for (let index = 0; index < schemaCount; index += 1) {
          normalized = EntityCompiler.omitUndefinedDeclaredProperties(normalized, itemSchemas[index]!, rootSchema);
        }
        return normalized;
      });
      return result;
    }
    if (!Predicates.isRecord(value)) {
      const result = value;
      return result;
    }
    const keys = Object.keys(value);
    if (keys.length === 0) {
      const result = value;
      return result;
    }
    const result: Record<string, unknown> = {};
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]!;
      const item = Reflect.get(value, key);
      const propertySchemas = EntityCompiler.propertySchemas(schema, rootSchema, key, new Set<string>());
      if (item === undefined) {
        if (EntityCompiler.isOptionalDeclaredProperty(schema, rootSchema, key, new Set<string>())) {
          continue;
        }
        Reflect.set(result, key, item);
        continue;
      }
      if (propertySchemas.length === 0) {
        Reflect.set(result, key, item);
        continue;
      }
      let normalized: unknown = item;
      const schemaCount = propertySchemas.length;
      for (let schemaIndex = 0; schemaIndex < schemaCount; schemaIndex += 1) {
        normalized = EntityCompiler.omitUndefinedDeclaredProperties(normalized, propertySchemas[schemaIndex]!, rootSchema);
      }
      Reflect.set(result, key, normalized);
    }
    return result;
  }

  /** Returns every object schema that declares a property through local references and composition. */
  private static propertySchemas(
    schema: object,
    rootSchema: object,
    propertyName: string,
    references: ReadonlySet<string>
  ): readonly Record<string, unknown>[] {
    const result: Record<string, unknown>[] = [];
    const referencedSchema = EntityCompiler.referencedSchema(schema, rootSchema, references);
    if (referencedSchema !== undefined) {
      result.push(...EntityCompiler.propertySchemas(referencedSchema.schema, rootSchema, propertyName, referencedSchema.references));
    }
    const properties = EntityCompiler.getSchemaObjectMember(schema, 'properties');
    const directPropertySchema = properties === undefined
      ? undefined
      : EntityCompiler.getSchemaObjectMember(properties, propertyName);
    const patternPropertySchema = directPropertySchema === undefined
      ? EntityCompiler.getPatternPropertySchema(EntityCompiler.getSchemaObjectMember(schema, 'patternProperties'), propertyName)
      : undefined;
    const directSchema = directPropertySchema ?? patternPropertySchema;
    if (directSchema !== undefined) {
      result.push(directSchema);
    }
    EntityCompiler.addAllOfPropertySchemas(result, schema, rootSchema, propertyName, references);
    const conditionalPropertySchemas = EntityCompiler.conditionalPropertySchemas(schema, rootSchema, propertyName, references);
    if (conditionalPropertySchemas === undefined) {
      return [];
    }
    result.push(...conditionalPropertySchemas);
    return result;
  }

  /** Determines whether a declared property can be omitted in every applicable composition branch. */
  private static isOptionalDeclaredProperty(
    schema: object,
    rootSchema: object,
    propertyName: string,
    references: ReadonlySet<string>
  ): boolean {
    const referencedSchema = EntityCompiler.referencedSchema(schema, rootSchema, references);
    const referenceOptional = referencedSchema === undefined
      ? false
      : EntityCompiler.isOptionalDeclaredProperty(referencedSchema.schema, rootSchema, propertyName, referencedSchema.references);
    const properties = EntityCompiler.getSchemaObjectMember(schema, 'properties');
    const directPropertySchema = properties === undefined
      ? undefined
      : EntityCompiler.getSchemaObjectMember(properties, propertyName);
    const patternPropertySchema = directPropertySchema === undefined
      ? EntityCompiler.getPatternPropertySchema(EntityCompiler.getSchemaObjectMember(schema, 'patternProperties'), propertyName)
      : undefined;
    const directOptional = (directPropertySchema ?? patternPropertySchema) !== undefined
      && !EntityCompiler.isRequiredProperty(schema, propertyName);
    const allOfOptional = EntityCompiler.hasOptionalAllOfProperty(schema, rootSchema, propertyName, references);
    const conditionalOptional = EntityCompiler.hasOptionalConditionalProperty(schema, rootSchema, propertyName, references);
    const declared = referenceOptional || directOptional || allOfOptional || conditionalOptional === true;
    if (!declared || EntityCompiler.hasRequiredDeclaredProperty(schema, rootSchema, propertyName, references)) {
      return false;
    }
    const result = conditionalOptional !== false;
    return result;
  }

  /** Adds property schemas declared by allOf branches. */
  private static addAllOfPropertySchemas(
    target: Record<string, unknown>[],
    schema: object,
    rootSchema: object,
    propertyName: string,
    references: ReadonlySet<string>
  ): void {
    const allOf = EntityCompiler.getSchemaArrayMember(schema, 'allOf');
    const count = allOf.length;
    for (let index = 0; index < count; index += 1) {
      target.push(...EntityCompiler.propertySchemas(allOf[index]!, rootSchema, propertyName, references));
    }
  }

  /** Requires every anyOf and oneOf branch to declare the property before it is normalized. */
  private static conditionalPropertySchemas(
    schema: object,
    rootSchema: object,
    propertyName: string,
    references: ReadonlySet<string>
  ): readonly Record<string, unknown>[] | undefined {
    const result: Record<string, unknown>[] = [];
    const keywords = ['anyOf', 'oneOf'];
    const keywordCount = keywords.length;
    for (let keywordIndex = 0; keywordIndex < keywordCount; keywordIndex += 1) {
      const branches = EntityCompiler.getSchemaArrayMember(schema, keywords[keywordIndex]!);
      if (branches.length === 0) {
        continue;
      }
      const branchCount = branches.length;
      for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
        const branchSchemas = EntityCompiler.propertySchemas(branches[branchIndex]!, rootSchema, propertyName, references);
        if (branchSchemas.length === 0) {
          return undefined;
        }
        result.push(...branchSchemas);
      }
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
    const validators = EntityCompiler.patternPropertyValidators.get(patternProperties)
      ?? new Map<string, EntityValidateFunctionInterface<Record<string, null>>>();
    EntityCompiler.patternPropertyValidators.set(patternProperties, validators);
    const patterns = Object.keys(patternProperties);
    for (let index = 0; index < patterns.length; index += 1) {
      const pattern = patterns[index]!;
      const patternSchema = EntityCompiler.getSchemaObjectMember(patternProperties, pattern);
      if (patternSchema === undefined) {
        continue;
      }
      let validator = validators.get(pattern);
      if (validator === undefined) {
        const patternMatchSchema: Record<string, boolean> = {};
        Reflect.set(patternMatchSchema, pattern, true);
        validator = EntityAjvInstance.assert.compile<Record<string, null>>({
          'additionalProperties': false,
          'patternProperties': patternMatchSchema,
          'type': 'object'
        });
        validators.set(pattern, validator);
      }
      const candidate: Record<string, null> = {};
      Reflect.set(candidate, propertyName, null);
      if (validator(candidate)) {
        return patternSchema;
      }
    }
    return undefined;
  }

  /** Finds whether an allOf branch declares an optional property. */
  private static hasOptionalAllOfProperty(
    schema: object,
    rootSchema: object,
    propertyName: string,
    references: ReadonlySet<string>
  ): boolean {
    const allOf = EntityCompiler.getSchemaArrayMember(schema, 'allOf');
    const count = allOf.length;
    for (let index = 0; index < count; index += 1) {
      if (EntityCompiler.isOptionalDeclaredProperty(allOf[index]!, rootSchema, propertyName, references)) {
        return true;
      }
    }
    return false;
  }

  /** Determines branch-safe optionality for anyOf and oneOf composition. */
  private static hasOptionalConditionalProperty(
    schema: object,
    rootSchema: object,
    propertyName: string,
    references: ReadonlySet<string>
  ): boolean | undefined {
    const keywords = ['anyOf', 'oneOf'];
    const keywordCount = keywords.length;
    let hasConditional = false;
    for (let keywordIndex = 0; keywordIndex < keywordCount; keywordIndex += 1) {
      const branches = EntityCompiler.getSchemaArrayMember(schema, keywords[keywordIndex]!);
      if (branches.length === 0) {
        continue;
      }
      hasConditional = true;
      const branchCount = branches.length;
      for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
        if (!EntityCompiler.isOptionalDeclaredProperty(branches[branchIndex]!, rootSchema, propertyName, references)) {
          return false;
        }
      }
    }
    const result = hasConditional ? true : undefined;
    return result;
  }

  /** Returns item schemas declared through local references and composition. */
  private static itemSchemas(
    schema: object,
    rootSchema: object,
    references: ReadonlySet<string>
  ): readonly Record<string, unknown>[] {
    const result: Record<string, unknown>[] = [];
    const referencedSchema = EntityCompiler.referencedSchema(schema, rootSchema, references);
    if (referencedSchema !== undefined) {
      result.push(...EntityCompiler.itemSchemas(referencedSchema.schema, rootSchema, referencedSchema.references));
    }
    const itemSchema = EntityCompiler.getSchemaObjectMember(schema, 'items');
    if (itemSchema !== undefined) {
      result.push(itemSchema);
    }
    const allOf = EntityCompiler.getSchemaArrayMember(schema, 'allOf');
    const allOfCount = allOf.length;
    for (let index = 0; index < allOfCount; index += 1) {
      result.push(...EntityCompiler.itemSchemas(allOf[index]!, rootSchema, references));
    }
    return result;
  }

  /** Resolves a local schema reference while preventing recursive reference loops. */
  private static referencedSchema(
    schema: object,
    rootSchema: object,
    references: ReadonlySet<string>
  ): { readonly 'references': ReadonlySet<string>; readonly 'schema': Record<string, unknown> } | undefined {
    const unknownReference: unknown = Reflect.get(schema, '$ref');
    if (!Predicates.isString(unknownReference)) {
      return undefined;
    }
    const reference = unknownReference;
    if (!reference.startsWith('#') || references.has(reference)) {
      return undefined;
    }
    const target = EntityCompiler.localReferenceTarget(reference, rootSchema);
    if (target === undefined) {
      return undefined;
    }
    const nextReferences = new Set(references);
    nextReferences.add(reference);
    const result = { 'references': nextReferences, 'schema': target };
    return result;
  }

  /** Resolves a local JSON Pointer reference from the schema root. */
  private static localReferenceTarget(reference: string, rootSchema: object): Record<string, unknown> | undefined {
    if (reference === '#') {
      const result = Predicates.isRecord(rootSchema) ? rootSchema : undefined;
      return result;
    }
    if (!reference.startsWith('#/')) {
      return undefined;
    }
    const segments = reference.slice(2).split('/');
    let target: unknown = rootSchema;
    const count = segments.length;
    for (let index = 0; index < count; index += 1) {
      const segment = segments[index]!.replaceAll('~1', '/').replaceAll('~0', '~');
      if (!Predicates.isRecord(target)) {
        return undefined;
      }
      target = Reflect.get(target, segment);
    }
    const result = Predicates.isRecord(target) ? target : undefined;
    return result;
  }

  /** Finds whether the schema requires a property. */
  private static isRequiredProperty(schema: object, propertyName: string): boolean {
    const unknownRequired: unknown = Reflect.get(schema, 'required');
    if (!Predicates.isArray(unknownRequired)) {
      return false;
    }
    const result = unknownRequired.some((item) => {
      const matchesProperty = item === propertyName;
      return matchesProperty;
    });
    return result;
  }

  /** Finds whether any applicable schema branch requires a property. */
  private static hasRequiredDeclaredProperty(
    schema: object,
    rootSchema: object,
    propertyName: string,
    references: ReadonlySet<string>
  ): boolean {
    if (EntityCompiler.isRequiredProperty(schema, propertyName)) {
      return true;
    }
    const referencedSchema = EntityCompiler.referencedSchema(schema, rootSchema, references);
    if (referencedSchema !== undefined
      && EntityCompiler.hasRequiredDeclaredProperty(referencedSchema.schema, rootSchema, propertyName, referencedSchema.references)) {
      return true;
    }
    const keywords = ['allOf', 'anyOf', 'oneOf'];
    const keywordCount = keywords.length;
    for (let keywordIndex = 0; keywordIndex < keywordCount; keywordIndex += 1) {
      const branches = EntityCompiler.getSchemaArrayMember(schema, keywords[keywordIndex]!);
      const branchCount = branches.length;
      for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
        if (EntityCompiler.hasRequiredDeclaredProperty(branches[branchIndex]!, rootSchema, propertyName, references)) {
          return true;
        }
      }
    }
    return false;
  }

  /** Returns an array of object-valued schemas from a composition member. */
  private static getSchemaArrayMember(schema: object, key: string): readonly Record<string, unknown>[] {
    const member: unknown = Reflect.get(schema, key);
    if (!Predicates.isArray(member)) {
      return [];
    }
    const result = member.filter((item): item is Record<string, unknown> => {
      const isObjectSchema = Predicates.isRecord(item);
      return isObjectSchema;
    });
    return result;
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
