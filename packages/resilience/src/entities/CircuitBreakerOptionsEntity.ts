import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

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
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
