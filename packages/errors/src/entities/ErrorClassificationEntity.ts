import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

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
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ErrorClassification', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ErrorClassification', 'type': 'object' } as const, { 'reason': SchemaNode.defineString({
    'description': 'Optional reason for classification (for logging/debugging)',
    'type': 'string'
  } as const), 'retryable': SchemaNode.defineBoolean({
    'description': 'Whether this error should trigger a retry',
    'type': 'boolean'
  } as const) }, ['retryable'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
