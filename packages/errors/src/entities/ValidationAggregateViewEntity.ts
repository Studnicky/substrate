import { type FromSchema, Guard, type JsonSchemaObjectType } from '@studnicky/types';

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
    if (typeof record.count !== 'number') { return false; }
    if (!Array.isArray(record.keywords) || !record.keywords.every((k) => { return typeof k === 'string'; })) { return false; }
    if (!Array.isArray(record.paths) || !record.paths.every((p) => { return typeof p === 'string'; })) { return false; }
    return true;
  }
}
