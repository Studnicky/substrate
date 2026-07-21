import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace MkdirOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'recursive': { 'type': 'boolean' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Options controlling directory creation. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
