import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace CircularBufferOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'capacity': { 'minimum': 1, 'type': 'integer' },
      'overflow': { 'enum': ['overwrite', 'grow'], 'type': 'string' }
    },
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** Construction options for {@link CircularBuffer}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
