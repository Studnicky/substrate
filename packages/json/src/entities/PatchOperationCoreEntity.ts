import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '../schema/SchemaValidator.js';

/** Schema-derived RFC-6902 operation fields shared by every wire variant. */
export namespace PatchOperationCoreEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'from': { 'type': 'string' },
      'op': { 'enum': ['add', 'copy', 'move', 'remove', 'replace', 'test'] },
      'path': { 'type': 'string' }
    },
    'required': ['op', 'path'],
    'title': 'PatchOperationCore',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
