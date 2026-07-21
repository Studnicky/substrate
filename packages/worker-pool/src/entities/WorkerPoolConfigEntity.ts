import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical serializable configuration for worker-pool construction. */
export namespace WorkerPoolConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'concurrency': { 'minimum': 1, 'type': 'integer' },
      'timeoutMs': { 'minimum': 0, 'type': 'number' },
      'workerPath': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['workerPath'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
