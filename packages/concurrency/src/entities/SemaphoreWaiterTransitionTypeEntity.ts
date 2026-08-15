import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Requested per-waiter lifecycle transition kind for `Semaphore`. */
export namespace SemaphoreWaiterTransitionTypeEntity {
  export const Schema = {
    'enum': ['markCancelled', 'markReady'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
