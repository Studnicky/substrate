import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace ContextConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'name': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['name'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** Configuration options for creating a Context instance. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
