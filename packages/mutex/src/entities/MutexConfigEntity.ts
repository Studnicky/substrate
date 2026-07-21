import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace MutexConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'enableCoalescing': { 'type': 'boolean' },
      'maxQueueSize': { 'minimum': 0, 'type': 'integer' },
      'timeout': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['enableCoalescing', 'maxQueueSize', 'timeout'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Mutex configuration options. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
