import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace SemaphoreOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'permits': { 'minimum': 1, 'type': 'integer' }
    },
    'required': ['permits'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Construction options for {@link Semaphore}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
