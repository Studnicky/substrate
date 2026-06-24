/**
 * Schema-validated options entity for `VirtualTimeCounter`.
 *
 * @module
 */
import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace VirtualTimeCounterOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'startMs': { 'type': 'number' }
    },
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** Construction options for {@link VirtualTimeCounter}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
