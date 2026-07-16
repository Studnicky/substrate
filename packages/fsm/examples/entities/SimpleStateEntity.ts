import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace SimpleStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'variant': { 'const': 'idle', 'type': 'string' }
    },
    'required': ['variant'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
