import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** FSM state for one `Retry.execute()` call. */
export namespace RetryCallStateEntity {
  export const Schema = {
    'enum': ['aborted', 'attempting', 'exhausted', 'failed', 'succeeded', 'waiting'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
