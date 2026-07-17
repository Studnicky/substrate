import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

/**
 * Options for destroy operation on dispatcher or client
 */
export namespace DestroyOptionsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/DestroyOptions',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Options for destroy operation on dispatcher or client',
    'properties': {
      'timeout': {
        'description': 'Maximum time to wait for pending requests before forcefully aborting (ms). Absent or 0 aborts immediately.',
        'minimum': 0,
        'type': 'number'
      }
    },
    'title': 'DestroyOptions',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
