import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace CircuitBreakerOptionsEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'failureThreshold': { 'minimum': 1, 'type': 'integer' },
      'name': { 'type': 'string' },
      'resetTimeoutMs': { 'minimum': 0, 'type': 'integer' },
      'successThreshold': { 'minimum': 1, 'type': 'integer' }
    },
    'required': ['failureThreshold', 'resetTimeoutMs'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
