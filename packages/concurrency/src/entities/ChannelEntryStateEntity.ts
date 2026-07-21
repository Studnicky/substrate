import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Serializable delivery state retained by a channel entry. */
export namespace ChannelEntryStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'cancelled': { 'type': 'boolean' } },
    'required': ['cancelled'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
