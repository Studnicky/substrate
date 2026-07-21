import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace TransitionRecordEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'event': { 'type': 'string' },
      'from': { 'type': 'string' },
      'to': { 'type': 'string' }
    },
    'required': ['event', 'from', 'to'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
