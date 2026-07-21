import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace ClampEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'clamped': { 'type': 'number' },
      'field': { 'type': 'string' },
      'raw': { 'type': 'number' },
      'reason': { 'type': 'string' }
    },
    'required': ['clamped', 'field', 'raw', 'reason'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
