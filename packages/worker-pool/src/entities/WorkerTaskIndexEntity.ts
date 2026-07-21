import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical input-order index assigned to one worker task. */
export namespace WorkerTaskIndexEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'index': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['index'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
