import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical retry and settlement flags retained for an assigned worker task. */
export namespace WorkerTaskDispositionEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'retried': { 'type': 'boolean' },
      'settled': { 'type': 'boolean' }
    },
    'required': ['retried', 'settled'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
