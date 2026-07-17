import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

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
  } as const satisfies JsonSchemaObjectType;

  /**
   * Output of TimingEvent.create().build().
   * Represents a fully validated timing event.
   */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
