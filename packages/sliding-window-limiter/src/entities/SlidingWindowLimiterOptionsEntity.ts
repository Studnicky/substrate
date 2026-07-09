import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace SlidingWindowLimiterOptionsEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'algorithm': { 'enum': ['log', 'counter'], 'type': 'string' },
      'limit': { 'minimum': 1, 'type': 'integer' },
      'windowMs': { 'exclusiveMinimum': 0, 'type': 'number' }
    },
    'required': ['limit', 'windowMs', 'algorithm'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
