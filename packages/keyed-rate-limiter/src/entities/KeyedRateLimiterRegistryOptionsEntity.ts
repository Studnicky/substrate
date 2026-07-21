import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical bounds for the per-key strategy registry. */
export namespace KeyedRateLimiterRegistryOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'keyIdleTtlMs': { 'minimum': 0, 'type': 'number' },
      'maxKeys': { 'minimum': 1, 'type': 'integer' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
