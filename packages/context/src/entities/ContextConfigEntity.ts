import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace ContextConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'name': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['name'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Configuration options for creating a Context instance. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
