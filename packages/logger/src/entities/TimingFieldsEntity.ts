import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/**
 * Timing fields for operations with measurable duration.
 * Include on completion events, not start events.
 */
export namespace TimingFieldsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/TimingFields',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Timing fields for operations with measurable duration.',
    'properties': {
      'durationMs': {
        'description': 'Duration in milliseconds. ALWAYS use this field name for timing.',
        'minimum': 0,
        'type': 'number'
      }
    },
    'required': ['durationMs'],
    'title': 'TimingFields',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
