import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace StepCtxTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'step': { 'type': 'number' },
      'value': { 'type': 'string' }
    },
    'required': ['step', 'value'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
