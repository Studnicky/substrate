/**
 * Schema-validated options entity for `RealTimeClockProvider`.
 *
 * @module
 */
import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace RealTimeClockProviderOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'offsetMs': { 'type': 'number' }
    },
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** Construction options for {@link RealTimeClockProvider}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
