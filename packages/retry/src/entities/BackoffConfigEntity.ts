import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Schema-validatable configuration shared by runtime backoff contracts. */
export namespace BackoffConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/BackoffConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'baseDelayMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['baseDelayMs'],
    'title': 'BackoffConfig',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
