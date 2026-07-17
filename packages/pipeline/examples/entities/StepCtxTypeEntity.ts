import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace StepCtxTypeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'step': { 'type': 'number' },
      'value': { 'type': 'string' }
    },
    'required': ['step', 'value'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
