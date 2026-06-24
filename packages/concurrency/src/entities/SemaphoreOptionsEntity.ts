import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace SemaphoreOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'permits': { 'minimum': 1, 'type': 'integer' }
    },
    'required': ['permits'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** Construction options for {@link Semaphore}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
