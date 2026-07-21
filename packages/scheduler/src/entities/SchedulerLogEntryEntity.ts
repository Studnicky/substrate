import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
