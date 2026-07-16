import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace MutexStatsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'activeLocksCount': { 'minimum': 0, 'type': 'integer' },
      'coalescedCount': { 'minimum': 0, 'type': 'integer' },
      'maxQueueSize': { 'minimum': 0, 'type': 'integer' },
      'queuedCount': { 'minimum': 0, 'type': 'integer' },
      'timeout': { 'minimum': 0, 'type': 'integer' },
      'totalExecuted': { 'minimum': 0, 'type': 'integer' }
    },
    'required': [
      'activeLocksCount',
      'coalescedCount',
      'maxQueueSize',
      'queuedCount',
      'timeout',
      'totalExecuted'
    ],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** Runtime statistics for mutex lock operations including queue depth and execution counts. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
