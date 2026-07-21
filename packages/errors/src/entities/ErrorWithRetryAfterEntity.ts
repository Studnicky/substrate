import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

/** Error with retry-after value (typically in seconds). */
export namespace ErrorWithRetryAfterEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithRetryAfter',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'retryAfter': { 'type': 'number' }
    },
    'required': ['retryAfter'],
    'title': 'ErrorWithRetryAfter',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  /**
   * Structural validator. Hand-written (not `SchemaValidator.compile`) because this
   * package is a dependency of `@studnicky/json`; depending on it here would form a
   * circular workspace reference.
   */
  export function validate(candidate: unknown): candidate is Type {
    if (!Guard.isObject(candidate)) { return false; }
    return typeof candidate.retryAfter === 'number';
  }
}
