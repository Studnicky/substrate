import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace ClampRuleEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'max': { 'type': 'number' },
      'min': { 'type': 'number' },
      'reason': { 'type': 'string' }
    },
    'required': ['max', 'min', 'reason'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
