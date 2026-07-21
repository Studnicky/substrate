import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical discriminator for a worker result envelope. */
export namespace WorkerResultEnvelopeDiscriminantEntity {
  export const Schema = {
    'additionalProperties': true,
    'properties': {
      'type': { 'const': 'result', 'type': 'string' }
    },
    'required': ['type'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
