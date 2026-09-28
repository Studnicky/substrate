import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

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
  } as const;

  /** Runtime statistics for mutex lock operations including queue depth and execution counts. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeLocksCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'coalescedCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'maximumQueueSize': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'queuedCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'timeout': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'totalExecuted': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) }, [
    'activeLocksCount',
    'coalescedCount',
    'maximumQueueSize',
    'queuedCount',
    'timeout',
    'totalExecuted'
  ] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
