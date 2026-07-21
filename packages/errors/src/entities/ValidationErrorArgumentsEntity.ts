import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

import { ValidationViolationDetailEntity } from './ValidationViolationDetailEntity.js';

const ALLOWED_KEYS = new Set(['correlationId', 'message', 'path', 'violations']);

/** Construction arguments for `ValidationError`. */
export namespace ValidationErrorArgumentsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationErrorArguments',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'correlationId': {
        'description': 'Optional correlation ID for distributed tracing.',
        'type': 'string'
      },
      'message': {
        'description': 'Human-readable summary of the validation failure.',
        'type': 'string'
      },
      'path': {
        'description': 'JSON Pointer or field name identifying the invalid value.',
        'type': 'string'
      },
      'violations': {
        'description': 'Structured validation violations.',
        'items': ValidationViolationDetailEntity.Schema,
        'type': 'array'
      }
    },
    'required': ['message', 'path'],
    'title': 'ValidationErrorArguments',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  /** Validates construction arguments without introducing a dependency on `@studnicky/json`. */
  export function validate(candidate: unknown): candidate is Type {
    if (!Guard.isObject(candidate)) { return false; }
    if (Object.keys(candidate).some((key) => { return !ALLOWED_KEYS.has(key); })) { return false; }
    if (typeof candidate.message !== 'string') { return false; }
    if (typeof candidate.path !== 'string') { return false; }
    if (candidate.correlationId !== undefined && typeof candidate.correlationId !== 'string') { return false; }
    if (candidate.violations === undefined) { return true; }
    if (!Array.isArray(candidate.violations)) { return false; }
    for (const violation of candidate.violations) {
      if (!ValidationViolationDetailEntity.validate(violation)) { return false; }
    }
    return true;
  }
}
