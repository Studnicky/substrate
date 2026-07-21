import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace BusQueueOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'highWaterMark': { 'minimum': 1, 'type': 'integer' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  /** JSON-serializable options for BusQueue construction. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
