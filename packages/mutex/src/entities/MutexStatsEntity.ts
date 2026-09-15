import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace MutexStatsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'activeLocksCount': { 'minimum': 0, 'type': 'integer' },
      'coalescedCount': { 'minimum': 0, 'type': 'integer' },
      'maximumQueueSize': { 'minimum': 0, 'type': 'integer' },
      'queuedCount': { 'minimum': 0, 'type': 'integer' },
      'timeout': { 'minimum': 0, 'type': 'integer' },
      'totalExecuted': { 'minimum': 0, 'type': 'integer' }
    },
    'required': [
      'activeLocksCount',
      'coalescedCount',
      'maximumQueueSize',
      'queuedCount',
      'timeout',
      'totalExecuted'
    ],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Runtime statistics for mutex lock operations including queue depth and execution counts. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
