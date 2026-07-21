import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '../schema/SchemaValidator.js';

/** Schema-derived serializable state carried by an internal draft node. */
export namespace DraftNodeStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'isArray': { 'type': 'boolean' }
    },
    'required': ['isArray'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
