import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace RequestStatsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RequestStats',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Statistics for request executor',
    'properties': {
      'failedRequests': {
        'description': 'Total number of requests that failed (after all retries)',
        'minimum': 0,
        'type': 'integer'
      },
      'successfulRequests': {
        'description': 'Total number of requests that succeeded',
        'minimum': 0,
        'type': 'integer'
      },
      'totalRequests': {
        'description': 'Total number of requests executed',
        'minimum': 0,
        'type': 'integer'
      },
      'totalRetries': {
        'description': 'Total number of retry attempts made',
        'minimum': 0,
        'type': 'integer'
      }
    },
    'required': ['failedRequests', 'successfulRequests', 'totalRequests', 'totalRetries'],
    'title': 'RequestStats',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
