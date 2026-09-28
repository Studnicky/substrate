import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { WorkerLifecycleAssignEventEntity } from './WorkerLifecycleAssignEventEntity.js';
import { WorkerLifecycleFreeEventEntity } from './WorkerLifecycleFreeEventEntity.js';
import { WorkerLifecycleKillEventEntity } from './WorkerLifecycleKillEventEntity.js';

/**
 * Canonical union of `WorkerLifecycleMachine`'s three transition events — see
 * `WorkerLifecycleMachine.ts` for the state graph each one drives.
 */
export namespace WorkerLifecycleEventEntity {
  export const Schema = {
    'oneOf': [WorkerLifecycleAssignEventEntity.Schema, WorkerLifecycleFreeEventEntity.Schema, WorkerLifecycleKillEventEntity.Schema]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [WorkerLifecycleAssignEventEntity.Node, WorkerLifecycleFreeEventEntity.Node, WorkerLifecycleKillEventEntity.Node]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
