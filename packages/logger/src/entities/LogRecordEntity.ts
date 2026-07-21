import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { LogDataEntity } from './LogDataEntity.js';

/**
 * Immutable log record assembled at emit time and passed to each transport.
 */
export namespace LogRecordEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/LogRecord',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Immutable log record assembled at emit time and passed to each transport.',
    'properties': {
      'data': LogDataEntity.Schema,
      'level': {
        'description': 'Log level numeric value (0 TRACE through 5 SILENT).',
        'enum': [0, 1, 2, 3, 4, 5],
        'type': 'integer'
      },
      'metadata': {
        'description': 'Metadata object attached to log entries.',
        'type': 'object'
      },
      'time': {
        'description': 'Epoch milliseconds timestamp at emit time.',
        'minimum': 0,
        'type': 'number'
      }
    },
    'required': ['data', 'level', 'metadata', 'time'],
    'title': 'LogRecord',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
