import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical discriminator for an exhausted async-iterator source. */
export namespace AsyncIterDoneDiscriminantEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'variant': { 'const': 'done', 'type': 'string' } },
    'required': ['variant'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
