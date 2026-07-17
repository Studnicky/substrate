import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace TaskEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'id': { 'type': 'number' },
      'label': { 'type': 'string' }
    },
    'required': ['id', 'label'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
