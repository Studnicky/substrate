import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Per-waiter lifecycle variant for a queued semaphore acquisition. */
export namespace SemaphoreWaiterVariantEntity {
  export const Schema = {
    'enum': ['queued', 'ready', 'cancelled'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
