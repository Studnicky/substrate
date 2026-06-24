import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace LruCacheOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'capacity': { 'minimum': 1, 'type': 'integer' },
      'prefix': { 'type': 'string' },
      'ttlMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['capacity'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** Construction options for {@link LruCache}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
