import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace UserCreatedEventMapEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'user:created': {
        'additionalProperties': false,
        'properties': {
          'email': { 'type': 'string' },
          'id': { 'type': 'string' }
        },
        'required': ['email', 'id'],
        'type': 'object'
      }
    },
    'required': ['user:created'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
