import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical worker envelope reporting task progress. */
export namespace WorkerProgressEnvelopeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'percent': { 'maximum': 100, 'minimum': 0, 'type': 'number' },
      'type': { 'const': 'progress', 'type': 'string' }
    },
    'required': ['percent', 'type'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
