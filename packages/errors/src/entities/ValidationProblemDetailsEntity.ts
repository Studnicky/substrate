import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

import { ValidationViolationEntity } from './ValidationViolationEntity.js';

/** RFC 7807 Problem Details payload for validation failure HTTP responses. */
export namespace ValidationProblemDetailsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationProblemDetails',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'detail': { 'type': 'string' },
      'errors': {
        'items': ValidationViolationEntity.Schema,
        'type': 'array'
      },
      'status': { 'type': 'number' },
      'title': { 'type': 'string' },
      'type': { 'type': 'string' }
    },
    'required': ['detail', 'errors', 'status', 'title', 'type'],
    'title': 'ValidationProblemDetails',
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
    if (typeof candidate.detail !== 'string') { return false; }
    if (typeof candidate.status !== 'number') { return false; }
    if (typeof candidate.title !== 'string') { return false; }
    if (typeof candidate.type !== 'string') { return false; }
    if (!Array.isArray(candidate.errors)) { return false; }
    for (const item of candidate.errors) {
      if (!ValidationViolationEntity.validate(item)) { return false; }
    }
    return true;
  }
}
