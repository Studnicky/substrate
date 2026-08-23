import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaIntakeError, SchemaValidator } from '@studnicky/json';

import { BackoffConfigEntity } from './BackoffConfigEntity.js';

const CONFIGURATION_KEYS = new Set([
  'backoffStrategy', 'errorClassifier', 'hookTimeoutMs', 'maximumElapsedMs', 'maximumRetries'
]);

export namespace RetryConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RetryConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Configuration for request retry behavior',
    'properties': {
      'hookTimeoutMs': {
        'description': 'When set, races each lifecycle hook against this timeout (ms); a hook that neither resolves nor rejects in time is treated as a failure',
        'exclusiveMinimum': 0,
        'type': 'integer'
      },
      'maximumElapsedMs': {
        'description': 'Maximum total elapsed time across all attempts (ms)',
        'minimum': 0,
        'type': 'integer'
      },
      'maximumRetries': {
        'description': 'Maximum number of retry attempts',
        'minimum': 0,
        'type': 'integer'
      }
    },
    'title': 'RetryConfig',
    'type': 'object'
  } as const satisfies JSONSchema;

  /** JSON-serializable retry configuration fields. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  const schemaIntake: SchemaIntakeFunctionInterface<FromSchema<typeof Schema>> = SchemaValidator.compileIntake(Schema);

  class Intake {
    /**
     * Parses one consumer-supplied retry configuration. JSON members are handled
     * by the schema; function-valued collaborators retain their explicit runtime
     * invariants are verified here because JSON Schema cannot represent functions.
     */
    static intake(input: Parameters<SchemaIntakeFunctionInterface<Type>>[0]): Type {
      if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        throw new SchemaIntakeError('config must be an object', [], 'RetryConfig');
      }

      const data: Record<string, unknown> = {};
      const keys = Object.keys(input);

      for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        const key = keys[keyIndex];
        if (key === undefined) {
          continue;
        }
        if (!CONFIGURATION_KEYS.has(key)) {
          throw new SchemaIntakeError(`"${key}" is not declared in the schema`, [], 'RetryConfig');
        }

        const value: unknown = Reflect.get(input, key);
        if (key === 'backoffStrategy') {
          if (value === null || typeof value !== 'object' || Array.isArray(value)) {
            throw new SchemaIntakeError('backoffStrategy must be an object with strategy and baseDelayMs', [], 'RetryConfig');
          }

          const strategy: unknown = Reflect.get(value, 'strategy');
          if (typeof strategy !== 'function') {
            throw new SchemaIntakeError('backoffStrategy.strategy must be a function', [], 'RetryConfig');
          }

          const baseDelayMs: unknown = Reflect.get(value, 'baseDelayMs');
          BackoffConfigEntity.intake({ 'baseDelayMs': baseDelayMs });
          continue;
        }

        if (key === 'errorClassifier') {
          if (typeof value === 'function') {
            continue;
          }
          if (value === null || typeof value !== 'object' || Array.isArray(value)) {
            throw new SchemaIntakeError('errorClassifier must be a function or an object with classify', [], 'RetryConfig');
          }

          const classify: unknown = Reflect.get(value, 'classify');
          if (typeof classify !== 'function') {
            throw new SchemaIntakeError('errorClassifier.classify must be a function', [], 'RetryConfig');
          }
          continue;
        }

        Reflect.set(data, key, value);
      }

      const parsed = schemaIntake(data);
      const result: Type = parsed;
      return result;
    }
  }
  export const intake: SchemaIntakeFunctionInterface<Type> = Intake.intake;
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
