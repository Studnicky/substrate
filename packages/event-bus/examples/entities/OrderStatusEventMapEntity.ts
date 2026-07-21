import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace OrderStatusEventMapEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'order:created': {
        'additionalProperties': false,
        'properties': {
          'id': { 'type': 'string' },
          'total': { 'type': 'number' }
        },
        'required': ['id', 'total'],
        'type': 'object'
      },
      'order:updated': {
        'additionalProperties': false,
        'properties': {
          'id': { 'type': 'string' },
          'status': { 'type': 'string' }
        },
        'required': ['id', 'status'],
        'type': 'object'
      }
    },
    'required': ['order:created', 'order:updated'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
