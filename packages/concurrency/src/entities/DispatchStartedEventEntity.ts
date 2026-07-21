import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Serializable event published when a bounded dispatch begins. */
export namespace DispatchStartedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'key': { 'minLength': 1, 'type': 'string' } },
    'required': ['key'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
