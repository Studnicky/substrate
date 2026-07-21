import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace ClampRuleEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'max': { 'type': 'number' },
      'min': { 'type': 'number' },
      'reason': { 'type': 'string' }
    },
    'required': ['max', 'min', 'reason'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
