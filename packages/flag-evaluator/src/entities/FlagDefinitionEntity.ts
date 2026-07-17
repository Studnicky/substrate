import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace FlagDefinitionEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'defaultValue': { 'type': 'boolean' },
      'enabled': { 'type': 'boolean' },
      'rolloutPercent': { 'maximum': 100, 'minimum': 0, 'type': 'number' }
    },
    'required': ['defaultValue', 'enabled'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** The shape registered under a flag name via `FlagEvaluator#register()`. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
