import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

/** Compact rollup of deduplicated paths and keywords with a total error count. */
export namespace ValidationAggregateViewEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationAggregateView',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'count': { 'type': 'number' },
      'keywords': {
        'items': { 'type': 'string' },
        'type': 'array'
      },
      'paths': {
        'items': { 'type': 'string' },
        'type': 'array'
      }
    },
    'required': ['count', 'keywords', 'paths'],
    'title': 'ValidationAggregateView',
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
    if (typeof candidate.count !== 'number') { return false; }
    if (!Array.isArray(candidate.keywords) || !candidate.keywords.every((k) => { return typeof k === 'string'; })) { return false; }
    if (!Array.isArray(candidate.paths) || !candidate.paths.every((p) => { return typeof p === 'string'; })) { return false; }
    return true;
  }
}
