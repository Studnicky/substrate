import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
