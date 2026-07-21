import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { TimingPrecisionEntity } from './TimingPrecisionEntity.js';

export namespace TimingOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maxEvents': {
        'description': 'Maximum number of events to store. Positive integer or null (sentinel for Infinity).',
        'oneOf': [
          { 'minimum': 1, 'type': 'integer' },
          { 'type': 'null' }
        ]
      },
      'precision': TimingPrecisionEntity.Schema
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
