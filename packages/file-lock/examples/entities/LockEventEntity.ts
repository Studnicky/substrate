import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace LockEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'extra': { 'type': 'string' },
      'hook': { 'type': 'string' },
      'path': { 'type': 'string' }
    },
    'required': ['hook', 'path'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
