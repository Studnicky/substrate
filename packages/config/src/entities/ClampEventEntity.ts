import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

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
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
