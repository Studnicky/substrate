import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical cache-presence state returned by a memoized lookup. */
export namespace CacheLookupEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'found': { 'type': 'boolean' } },
    'required': ['found'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
