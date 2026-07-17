import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

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
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
