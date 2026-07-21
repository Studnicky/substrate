import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace SampleBufferStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'isFull': { 'type': 'boolean' },
      'length': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['isFull', 'length'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Observable state exposed by a sample buffer. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
