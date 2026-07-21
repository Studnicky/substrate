/**
 * Schema-validated options entity for `VirtualTimeCounter`.
 *
 * @module
 */
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace VirtualTimeCounterOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'startMs': { 'type': 'number' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Construction options for {@link VirtualTimeCounter}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
