import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace IdempotencyGuardOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'capacity': { 'minimum': 1, 'type': 'integer' },
      'ttlMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['capacity', 'ttlMs'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** Construction options for {@link IdempotencyGuard}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
