import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Schema-derived metadata captured for an interpreter history record. */
export namespace InterpreterHistoryRecordMetadataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'timestamp': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['timestamp'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
