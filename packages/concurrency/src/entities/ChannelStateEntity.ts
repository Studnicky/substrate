import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Serializable lifecycle flags retained for one channel key. */
export namespace ChannelStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'closed': { 'type': 'boolean' },
      'subscriber': { 'type': 'boolean' }
    },
    'required': ['closed', 'subscriber'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
