import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace SchedulerLogEntryEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/SchedulerLogEntry',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'A single lifecycle event recorded by a logging scheduler.',
    'properties': {
      'event': {
        'enum': ['schedule', 'fire'],
        'type': 'string'
      },
      'id': {
        'type': 'string'
      }
    },
    'required': ['event', 'id'],
    'title': 'SchedulerLogEntry',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
