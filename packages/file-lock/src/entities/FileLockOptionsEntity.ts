import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace FileLockOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'path': { 'minLength': 1, 'type': 'string' },
      'pollMs': { 'exclusiveMinimum': 0, 'type': 'number' },
      'timeoutMs': { 'exclusiveMinimum': 0, 'type': 'number' }
    },
    'required': ['path'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
