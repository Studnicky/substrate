import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace LoggerOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'level': {
        'description': 'Global minimum log level. Records below this floor are discarded.',
        'oneOf': [
          { 'enum': ['trace', 'debug', 'info', 'warn', 'error', 'silent'], 'type': 'string' },
          { 'maximum': 5, 'minimum': 0, 'type': 'number' }
        ]
      },
      'metadata': {
        'description': 'Base metadata attached to every record.',
        'type': 'object'
      }
    },
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
