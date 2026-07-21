import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical worker envelope carrying an observational log message. */
export namespace WorkerLogEnvelopeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'message': { 'type': 'string' },
      'type': { 'const': 'log', 'type': 'string' }
    },
    'required': ['message', 'type'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
