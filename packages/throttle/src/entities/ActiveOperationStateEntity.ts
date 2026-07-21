import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace ActiveOperationStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'completed': { 'type': 'boolean' }
    },
    'required': ['completed'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Completion state retained for an active operation. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
