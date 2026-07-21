import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical original and owner-qualified paths retained by an acquired lock. */
export namespace FileLockPathStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'lockPath': { 'minLength': 1, 'type': 'string' },
      'originalPath': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['lockPath', 'originalPath'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
