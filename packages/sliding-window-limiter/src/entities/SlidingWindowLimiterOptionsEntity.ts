import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
