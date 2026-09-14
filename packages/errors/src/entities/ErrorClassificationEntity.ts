import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/**
 * Error classification result.
 *
 * Classifiers determine IF an error should be retried.
 * Backoff strategies determine HOW LONG to wait between retries.
 */
export namespace ErrorClassificationEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorClassification',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'reason': {
        'description': 'Optional reason for classification (for logging/debugging)',
        'type': 'string'
      },
      'retryable': {
        'description': 'Whether this error should trigger a retry',
        'type': 'boolean'
      }
    },
    'required': ['retryable'],
    'title': 'ErrorClassification',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
