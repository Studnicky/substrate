import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/**
 * Configuration options for ConsoleTransport.
 */
export namespace ConsoleTransportOptionsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ConsoleTransportOptions',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Configuration options for ConsoleTransport.',
    'properties': {
      'level': {
        'description': 'Minimum log level this transport accepts. Records below this level are silently ignored. Defaults to the Logger global floor (TRACE).',
        'oneOf': [
          { 'enum': ['trace', 'debug', 'info', 'warn', 'error', 'silent'], 'type': 'string' },
          { 'enum': [0, 1, 2, 3, 4, 5], 'type': 'integer' }
        ]
      }
    },
    'title': 'ConsoleTransportOptions',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
