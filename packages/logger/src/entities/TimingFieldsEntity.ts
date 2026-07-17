import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

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
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
