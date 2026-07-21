import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace HookRequestContextEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'elapsed': { 'minimum': 0, 'type': 'number' },
      'headers': {
        'additionalProperties': { 'type': 'string' },
        'type': 'object'
      },
      'url': { 'type': 'string' }
    },
    'required': ['headers', 'url'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
