import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Statuses that represent failed outcomes. */
export namespace FailureStatusEntity {
  export const Schema = {
    'enum': ['failed', 'timeout', 'invalid', 'not_found', 'unauthorized', 'rate_limited', 'unavailable'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
