import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '../schema/SchemaValidator.js';

/** Schema-derived status fields returned after applying a patch. */
export namespace PatchApplyResultStatusEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'error': { 'type': 'string' },
      'success': { 'type': 'boolean' }
    },
    'required': ['success'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
