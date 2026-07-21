import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace TimingEventDataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'event': {
        'description': "The formatted event name. Format: 'component.operation' or 'component.operation.status'",
        'type': 'string'
      }
    },
    'required': ['event'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /**
   * Output of TimingEvent.create().
   * Represents a fully validated timing event.
   */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
