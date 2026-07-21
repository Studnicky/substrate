import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical cursor input that marks a paginated source as exhausted. */
export namespace PaginatorExhaustedCursorEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'exhausted': { 'const': true, 'type': 'boolean' }
    },
    'required': ['exhausted'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
