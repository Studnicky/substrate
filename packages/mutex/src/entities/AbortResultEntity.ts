import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace AbortResultEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cancelled': { 'minimum': 0, 'type': 'integer' },
      'completed': { 'minimum': 0, 'type': 'integer' },
      'timedOut': { 'type': 'boolean' }
    },
    'required': ['cancelled', 'completed', 'timedOut'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /**
   * Result of an abort operation on a throttle or similar async primitive.
   *
   * Contains statistics about what happened during the abort:
   * - How many operations were cancelled
   * - How many completed before the abort
   * - Whether the grace period timed out
   */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
