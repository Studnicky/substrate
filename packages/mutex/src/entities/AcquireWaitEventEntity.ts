import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace AcquireWaitEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'key': { 'type': 'string' },
      'waitTimeMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['key', 'waitTimeMs'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
