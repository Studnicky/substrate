import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical key and token count accepted by rate-limit operations. */
export namespace RateLimitRequestEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'key': { 'minLength': 1, 'type': 'string' },
      'tokens': { 'exclusiveMinimum': 0, 'type': 'number' }
    },
    'required': ['key'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
