import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

/**
 * Telemetry event emitted when a request starts.
 */
export namespace RequestEventEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RequestEvent',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Telemetry event emitted when a request starts.',
    'properties': {
      'method': { 'description': 'HTTP method.', 'type': 'string' },
      'requestId': { 'description': 'Unique identifier for this request.', 'type': 'string' },
      'url': { 'description': 'Request URL.', 'type': 'string' }
    },
    'required': ['method', 'requestId', 'url'],
    'title': 'RequestEvent',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
