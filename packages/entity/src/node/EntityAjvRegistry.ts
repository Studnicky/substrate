/**
 * EntityAjvRegistry — configured Ajv v8 validator for Node ESM.
 *
 * Targets JSON Schema 2020-12 (`ajv/dist/2020`) with strict mode so malformed
 * schemas fail loudly at compile time rather than silently at validate time.
 * Ajv compiles schemas by constructing functions at runtime, which requires
 * `unsafe-eval`; this backend is Node-only for that reason.
 *
 * @module
 */
import type { ErrorObject } from 'ajv/dist/2020.js';

import * as addFormatsModule from 'ajv-formats';
import { Ajv2020 } from 'ajv/dist/2020.js';

import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';
import type { EntityValidationErrorInterface } from '../interfaces/EntityValidationErrorInterface.js';
import type { SchemaCompilerInterface } from '../interfaces/SchemaCompilerInterface.js';
import type { SchemaRegistrySetInterface } from '../interfaces/SchemaRegistrySetInterface.js';

import { EntityDiagnostics } from '../EntityDiagnostics.js';
import { SchemaId } from '../SchemaId.js';

interface MutableValidateFunctionInterface<TValidated> {
  (data: unknown): data is TValidated;
  'errors': readonly EntityValidationErrorInterface[] | null;
}

/** The Ajv `params` field holding a keyword's schema-declared comparison value, keyed by keyword. */
const KEYWORD_VALUE_PARAM = new Map<string, string>([
  ['exclusiveMaximum', 'limit'],
  ['exclusiveMinimum', 'limit'],
  ['format', 'format'],
  ['maximum', 'limit'],
  ['maxItems', 'limit'],
  ['maxLength', 'limit'],
  ['maxProperties', 'limit'],
  ['minimum', 'limit'],
  ['minItems', 'limit'],
  ['minLength', 'limit'],
  ['minProperties', 'limit'],
  ['multipleOf', 'multipleOf'],
  ['pattern', 'pattern'],
  ['type', 'type'],
  ['unevaluatedItems', 'limit']
]);

class EntityAjvCompiler {
  /** Wraps an Ajv instance so its diagnostics route through {@link EntityDiagnostics} before consumers see them. */
  public static wrap(instance: Ajv2020): SchemaCompilerInterface {
    const cache = new Map<string, MutableValidateFunctionInterface<unknown>>();

    const compile = <TValidated>(schema: object | boolean): EntityValidateFunctionInterface<TValidated> => {
      const id = SchemaId.of(schema);
      if (id !== undefined) {
        const existing = cache.get(id);
        if (existing !== undefined) {
          return existing as MutableValidateFunctionInterface<TValidated>;
        }
      }
      const validate = instance.compile<TValidated>(schema);
      const predicate = ((data: unknown): data is TValidated => {
        const valid = validate(data);
        predicate.errors = valid ? null : (validate.errors ?? []).map(EntityAjvCompiler.toEntityError);
        return valid;
      }) as MutableValidateFunctionInterface<TValidated>;
      predicate.errors = null;
      if (id !== undefined) {
        cache.set(id, predicate);
      }
      return predicate;
    };

    const getSchema = <TValidated>(key: string): EntityValidateFunctionInterface<TValidated> | undefined => {
      const result = cache.get(key) as MutableValidateFunctionInterface<TValidated> | undefined;
      return result;
    };

    const result: SchemaCompilerInterface = { 'compile': compile, 'getSchema': getSchema };
    return result;
  }

  /** Converts an Ajv error object into the diagnostic entity consumers expect. */
  private static toEntityError(error: ErrorObject): EntityValidationErrorInterface {
    const errorParameters = error.params as Readonly<Record<string, unknown>>;
    const valueParam = KEYWORD_VALUE_PARAM.get(error.keyword);
    const keywordValue = valueParam === undefined ? undefined : Reflect.get(errorParameters, valueParam);
    const missingProperty = typeof errorParameters.missingProperty === 'string' ? errorParameters.missingProperty : undefined;
    const additionalProperty = typeof errorParameters.additionalProperty === 'string' ? errorParameters.additionalProperty : undefined;
    const containsMinimum = typeof errorParameters.minContains === 'number' ? errorParameters.minContains : undefined;
    const containsMaximum = typeof errorParameters.maxContains === 'number' ? errorParameters.maxContains : undefined;
    const dependentProperty = typeof errorParameters.property === 'string' ? errorParameters.property : undefined;
    const missingDependentProperties = typeof errorParameters.deps === 'string' ? errorParameters.deps.split(', ') : undefined;
    const canonicalMessage = EntityDiagnostics.render({
      'additionalProperty': additionalProperty,
      'containsMaximum': containsMaximum,
      'containsMinimum': containsMinimum,
      'dependentProperty': dependentProperty,
      'keyword': error.keyword,
      'keywordValue': keywordValue,
      'missingDependentProperties': missingDependentProperties,
      'missingProperty': missingProperty
    });
    const diagnostic: Record<string, unknown> = {
      'instancePath': error.instancePath,
      'keyword': error.keyword,
      'message': canonicalMessage ?? error.message ?? 'invalid',
      'params': errorParameters,
      'schemaPath': error.schemaPath
    };
    const result = diagnostic as unknown as EntityValidationErrorInterface;
    return result;
  }
}

/** Assert validation stays non-mutating so `compile` remains a pure predicate. */
const ajvInstance = new Ajv2020({
  'allErrors': true,
  'allowUnionTypes': true,
  'strict': true
});

/** Intake fills schema defaults on a private clone; validation preserves the schema's property rules. */
const ajvIntakeInstance = new Ajv2020({
  'allErrors': true,
  'allowUnionTypes': true,
  'strict': true,
  'useDefaults': true
});

/** Create fills schema defaults on a private clone; validation preserves the schema's property rules. */
const ajvCreateInstance = new Ajv2020({
  'allErrors': true,
  'allowUnionTypes': true,
  'strict': true,
  'useDefaults': true
});

addFormatsModule.default.default(ajvInstance);
addFormatsModule.default.default(ajvIntakeInstance);
addFormatsModule.default.default(ajvCreateInstance);

/** The isolated Ajv instances that back assertion, intake, and creation. */
export const EntityAjvRegistry: SchemaRegistrySetInterface = {
  'assert': EntityAjvCompiler.wrap(ajvInstance),
  'create': EntityAjvCompiler.wrap(ajvCreateInstance),
  'intake': EntityAjvCompiler.wrap(ajvIntakeInstance)
};
