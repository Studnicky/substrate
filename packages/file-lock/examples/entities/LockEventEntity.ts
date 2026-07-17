import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace LockEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'extra': { 'type': 'string' },
      'hook': { 'type': 'string' },
      'path': { 'type': 'string' }
    },
    'required': ['hook', 'path'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
