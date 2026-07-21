import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical per-key mutex lifecycle state. */
export namespace MutexKeyStateEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'enum': ['locked', 'queued', 'unlocked'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
