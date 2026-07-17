import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace ChannelOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'highWaterMark': { 'exclusiveMinimum': 0, 'type': 'integer' }
    },
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** Construction options for {@link Channel}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
