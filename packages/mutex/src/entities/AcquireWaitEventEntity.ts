import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace AcquireWaitEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'key': { 'type': 'string' },
      'waitTimeMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['key', 'waitTimeMs'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
