import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace UserCreatedEventMapEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'user:created': {
        'additionalProperties': false,
        'properties': {
          'email': { 'type': 'string' },
          'id': { 'type': 'string' }
        },
        'required': ['email', 'id'],
        'type': 'object'
      }
    },
    'required': ['user:created'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
