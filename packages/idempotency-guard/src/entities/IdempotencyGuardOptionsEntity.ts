import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace IdempotencyGuardOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'capacity': { 'minimum': 1, 'type': 'integer' },
      'ttlMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['capacity', 'ttlMs'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Construction options for {@link IdempotencyGuard}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
