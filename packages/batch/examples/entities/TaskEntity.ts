import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace TaskEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'id': { 'type': 'number' },
      'label': { 'type': 'string' }
    },
    'required': ['id', 'label'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
