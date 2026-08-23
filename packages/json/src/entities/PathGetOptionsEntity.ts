import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '../schema/SchemaValidator.js';

/** Options for path traversal. */
export namespace PathGetOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maximumDepth': { 'minimum': 0, 'type': 'integer' }
    },
    'title': 'PathGetOptionsType',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
  export const intake = SchemaValidator.compileIntake<Type>(Schema);
  export const create = SchemaValidator.compileCreate<Type>(Schema);
}
