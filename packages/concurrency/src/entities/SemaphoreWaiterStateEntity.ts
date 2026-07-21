import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Serializable lifecycle flags retained for a queued semaphore waiter. */
export namespace SemaphoreWaiterStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cancelled': { 'type': 'boolean' },
      'ready': { 'type': 'boolean' }
    },
    'required': ['cancelled', 'ready'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
