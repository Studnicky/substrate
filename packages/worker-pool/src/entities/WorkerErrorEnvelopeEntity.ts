import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical worker envelope reporting a task failure. */
export namespace WorkerErrorEnvelopeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'error': { 'type': 'string' },
      'type': { 'const': 'error', 'type': 'string' }
    },
    'required': ['error', 'type'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
