import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '../schema/SchemaValidator.js';

/** Schema-derived wildcard metadata returned during path traversal. */
export namespace PathWildcardResultEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'isWildcard': { 'const': true },
      'remainingPath': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': ['isWildcard', 'remainingPath'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
