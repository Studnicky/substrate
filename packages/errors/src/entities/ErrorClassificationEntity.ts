import { type FromSchema, Guard, type JsonSchemaObjectType } from '@studnicky/types';

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
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  /**
   * Structural validator. Hand-written (not `SchemaValidator.compile`) because this
   * package is a dependency of `@studnicky/json`; depending on it here would form a
   * circular workspace reference.
   */
  export function validate(candidate: unknown): candidate is Type {
    const record = Guard.asRecord(candidate);
    if (record === undefined) { return false; }
    if (typeof record.retryable !== 'boolean') { return false; }
    if (record.reason !== undefined && typeof record.reason !== 'string') { return false; }
    return true;
  }
}
