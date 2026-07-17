import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

/**
 * Request metadata that flows through the request/response lifecycle
 * Contains tracking information, timing data, and user-provided metadata
 * All properties are always present for V8 optimization (consistent hidden class)
 */
export namespace RequestMetadataEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RequestMetadata',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Request metadata that flows through the request/response lifecycle',
    'properties': {
      'metadata': {
        'description': 'User-provided metadata for logging and tracking. Key-value pairs that flow through lifecycle hooks.',
        'type': 'object'
      },
      'method': {
        'description': 'HTTP method (GET, POST, etc.)',
        'type': 'string'
      },
      'path': {
        'description': 'Original path before URL building',
        'type': 'string'
      },
      'requestId': {
        'description': 'Unique identifier for this request. Auto-generated or provided by user.',
        'type': 'string'
      }
    },
    'required': ['metadata', 'method', 'path', 'requestId'],
    'title': 'RequestMetadata',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
