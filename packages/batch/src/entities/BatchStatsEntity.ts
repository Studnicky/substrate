import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace BatchStatsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'failed': { 'minimum': 0, 'type': 'integer' },
      'succeeded': { 'minimum': 0, 'type': 'integer' },
      'total': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['failed', 'succeeded', 'total'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** Aggregate completion statistics emitted by the onBatchComplete hook. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
