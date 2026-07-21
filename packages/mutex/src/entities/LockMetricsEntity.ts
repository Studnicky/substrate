import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace LockMetricsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'acquiredAt': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['acquiredAt'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Metrics recorded when a lock is acquired. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
