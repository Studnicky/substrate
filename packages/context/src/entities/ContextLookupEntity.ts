import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace ContextLookupEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'found': { 'type': 'boolean' },
      'value': {}
    },
    'required': ['found', 'value'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Presence-aware result returned by a non-throwing context lookup. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
