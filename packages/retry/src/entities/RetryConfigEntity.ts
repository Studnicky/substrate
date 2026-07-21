import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace RetryConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RetryConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Configuration for request retry behavior',
    'properties': {
      'hookTimeoutMs': {
        'description': 'When set, races each lifecycle hook against this timeout (ms); a hook that neither resolves nor rejects in time is treated as a failure',
        'exclusiveMinimum': 0,
        'type': 'integer'
      },
      'maxElapsedMs': {
        'description': 'Maximum total elapsed time across all attempts (ms)',
        'minimum': 0,
        'type': 'integer'
      },
      'maxRetries': {
        'description': 'Maximum number of retry attempts',
        'minimum': 0,
        'type': 'integer'
      }
    },
    'title': 'RetryConfig',
    'type': 'object'
  } as const satisfies JSONSchema;

  /** JSON-serializable configuration shape. Contains only schema-validatable members. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
