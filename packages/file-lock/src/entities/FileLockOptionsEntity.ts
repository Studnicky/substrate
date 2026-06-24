import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace FileLockOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'path': { 'minLength': 1, 'type': 'string' },
      'pollMs': { 'exclusiveMinimum': 0, 'type': 'number' },
      'timeoutMs': { 'exclusiveMinimum': 0, 'type': 'number' }
    },
    'required': ['path'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
