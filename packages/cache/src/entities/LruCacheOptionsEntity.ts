import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace LruCacheOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'capacity': { 'minimum': 1, 'type': 'integer' },
      'staleMs': { 'minimum': 0, 'type': 'number' },
      'ttlMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['capacity'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Construction options for {@link LruCache}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
