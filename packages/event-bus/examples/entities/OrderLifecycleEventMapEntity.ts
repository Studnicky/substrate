import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace OrderLifecycleEventMapEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'order:placed': {
        'additionalProperties': false,
        'properties': {
          'id': { 'type': 'string' },
          'total': { 'type': 'number' }
        },
        'required': ['id', 'total'],
        'type': 'object'
      },
      'order:shipped': {
        'additionalProperties': false,
        'properties': {
          'carrier': { 'type': 'string' },
          'id': { 'type': 'string' }
        },
        'required': ['carrier', 'id'],
        'type': 'object'
      }
    },
    'required': ['order:placed', 'order:shipped'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
