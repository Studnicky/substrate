import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical discriminator for an async-iterator value. */
export namespace AsyncIterValueDiscriminantEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'variant': { 'const': 'value', 'type': 'string' } },
    'required': ['variant'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
