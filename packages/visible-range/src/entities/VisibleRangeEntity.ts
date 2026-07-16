import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace VisibleRangeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'end': { 'type': 'number' },
      'start': { 'type': 'number' }
    },
    'required': ['end', 'start'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** Inclusive `[start, end]` index range of currently visible items. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
