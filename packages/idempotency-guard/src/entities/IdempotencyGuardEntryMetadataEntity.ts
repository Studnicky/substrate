import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Schema-derived metadata stored with an idempotency result. */
export namespace IdempotencyGuardEntryMetadataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'fingerprint': { 'type': 'string' }
    },
    'required': ['fingerprint'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
