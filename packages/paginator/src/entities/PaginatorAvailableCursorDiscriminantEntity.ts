import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical discriminator shared by cursor inputs that provide another cursor. */
export namespace PaginatorAvailableCursorDiscriminantEntity {
  export const Schema = {
    'properties': {
      'exhausted': { 'const': false, 'type': 'boolean' }
    },
    'required': ['exhausted'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
