import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace LruCacheNodeTimingEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'expiresAt': { 'minimum': 0, 'type': 'number' },
      'staleAt': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['expiresAt', 'staleAt'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
