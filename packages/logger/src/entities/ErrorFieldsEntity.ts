import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

/**
 * Error fields for failed operations.
 * Include when status is a failure state.
 */
export namespace ErrorFieldsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorFields',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Error fields for failed operations.',
    'properties': {
      'cause': {
        'description': 'Underlying cause message (for chained errors).',
        'type': 'string'
      },
      'error': {
        'description': 'Human-readable error message.',
        'type': 'string'
      },
      'errorCode': {
        'description': 'Machine-readable error code.',
        'type': 'string'
      }
    },
    'required': ['error'],
    'title': 'ErrorFields',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
