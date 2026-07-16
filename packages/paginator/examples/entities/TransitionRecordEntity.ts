import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace TransitionRecordEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'event': { 'type': 'string' },
      'from': { 'type': 'string' },
      'to': { 'type': 'string' }
    },
    'required': ['event', 'from', 'to'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
