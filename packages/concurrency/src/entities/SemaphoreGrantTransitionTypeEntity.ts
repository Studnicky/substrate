import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Requested transition kind for `Semaphore`'s waiter-granting reentrancy guard. */
export namespace SemaphoreGrantTransitionTypeEntity {
  export const Schema = {
    'enum': ['finish', 'start'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
