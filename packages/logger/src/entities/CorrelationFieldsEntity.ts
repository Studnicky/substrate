import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/**
 * Correlation fields for tracing operations across the stack.
 * Set once at request entry, inherited via child loggers.
 */
export namespace CorrelationFieldsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/CorrelationFields',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Correlation fields for tracing operations across the stack.',
    'properties': {
      'orgId': {
        'description': 'Organization ID for multi-tenant contexts.',
        'type': 'string'
      },
      'requestId': {
        'description': 'Unique request identifier (UUID v4). From X-Request-Id header or generated.',
        'type': 'string'
      },
      'teamId': {
        'description': 'Team ID within organization.',
        'type': 'string'
      },
      'traceId': {
        'description': 'Distributed trace ID for cross-service tracing. From X-Trace-Id header or propagated context.',
        'type': 'string'
      },
      'userId': {
        'description': 'Authenticated user ID.',
        'type': 'string'
      }
    },
    'required': ['requestId'],
    'title': 'CorrelationFields',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
