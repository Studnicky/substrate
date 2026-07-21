import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/**
 * Telemetry event emitted when a request completes successfully.
 */
export namespace ResponseEventEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ResponseEvent',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Telemetry event emitted when a request completes successfully.',
    'properties': {
      'durationMs': { 'description': 'Request duration in milliseconds.', 'minimum': 0, 'type': 'number' },
      'method': { 'description': 'HTTP method.', 'type': 'string' },
      'requestId': { 'description': 'Unique identifier for this request.', 'type': 'string' },
      'statusCode': { 'description': 'HTTP response status code.', 'minimum': 100, 'type': 'integer' }
    },
    'required': ['durationMs', 'method', 'requestId', 'statusCode'],
    'title': 'ResponseEvent',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
