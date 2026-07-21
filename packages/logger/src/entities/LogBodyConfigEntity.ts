import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { LogStatusEntity } from './LogStatusEntity.js';

/** Direct configuration accepted by `LogBody.create()`. */
export namespace LogBodyConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/LogBodyConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Configuration for a normalized log entry.',
    'properties': {
      'component': {
        'description': 'Event component prefix.',
        'type': 'string'
      },
      'context': {
        'description': 'Freeform application data as a JSON blob.',
        'type': 'object'
      },
      'durationMs': {
        'description': 'Duration in milliseconds.',
        'minimum': 0,
        'type': 'number'
      },
      'message': {
        'description': 'Human-readable log message.',
        'type': 'string'
      },
      'operation': {
        'description': 'Event operation suffix.',
        'type': 'string'
      },
      'status': LogStatusEntity.Schema
    },
    'required': ['component', 'context', 'message', 'operation', 'status'],
    'title': 'LogBodyConfig',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
