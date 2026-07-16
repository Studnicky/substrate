import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

import { SchemaValidator } from '../schema/SchemaValidator.js';

/** Options for path traversal. */
export namespace PathGetOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maxDepth': { 'minimum': 0, 'type': 'integer' }
    },
    'title': 'PathGetOptionsType',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
