import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

import { LogBodyDataEntity } from './LogBodyDataEntity.js';
import { LogFaultDataEntity } from './LogFaultDataEntity.js';

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
      'data': {
        'description': 'Either a standard log body or a fault/error log entry.',
        'oneOf': [LogBodyDataEntity.Schema, LogFaultDataEntity.Schema]
      },
      'level': {
        'description': 'Log level numeric value (0 TRACE through 5 SILENT).',
        'maximum': 5,
        'minimum': 0,
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
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
