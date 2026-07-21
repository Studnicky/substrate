import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Mutable schema-validatable fields carried by a retry lifecycle context. */
export namespace RetryContextDataEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RetryContextData',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'abort': { 'type': 'boolean' },
      'attemptNumber': { 'minimum': 0, 'type': 'integer' },
      'delayMs': { 'minimum': 0, 'type': 'number' },
      'elapsedMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['attemptNumber', 'delayMs', 'elapsedMs'],
    'title': 'RetryContextData',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
