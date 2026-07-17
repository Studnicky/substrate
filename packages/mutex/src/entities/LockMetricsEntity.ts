import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace LockMetricsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'acquiredAt': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['acquiredAt'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** Metrics recorded when a lock is acquired. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
