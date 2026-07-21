import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

/** Human-readable diagnostic fields exposed by Error-compatible contracts. */
export namespace ErrorDiagnosticEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorDiagnostic',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'message': { 'type': 'string' },
      'name': { 'type': 'string' },
      'stack': { 'type': 'string' }
    },
    'required': ['message', 'name'],
    'title': 'ErrorDiagnostic',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  /** Validates the schema-backed diagnostic fields without introducing a json-package cycle. */
  export function validate(candidate: unknown): candidate is Type {
    if (!Guard.isObject(candidate)) { return false; }
    if (typeof candidate.message !== 'string' || typeof candidate.name !== 'string') { return false; }
    return candidate.stack === undefined || typeof candidate.stack === 'string';
  }
}
