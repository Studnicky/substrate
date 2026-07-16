import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

/**
 * Configuration options for FunctionTransport.
 */
export namespace FunctionTransportOptionsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/FunctionTransportOptions',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Configuration options for FunctionTransport.',
    'properties': {
      'level': {
        'description': 'Minimum log level this transport accepts. Records below this level are silently ignored. Defaults to the Logger global floor (TRACE).',
        'oneOf': [
          { 'enum': ['trace', 'debug', 'info', 'warn', 'error', 'silent'], 'type': 'string' },
          { 'maximum': 5, 'minimum': 0, 'type': 'number' }
        ]
      }
    },
    'title': 'FunctionTransportOptions',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
