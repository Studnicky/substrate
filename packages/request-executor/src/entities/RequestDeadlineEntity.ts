import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical request deadline accepted by executor defaults and per-call overrides. */
export namespace RequestDeadlineEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'deadlineMs': { 'minimum': 0, 'type': 'number' } },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
