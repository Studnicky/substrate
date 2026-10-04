import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Requested per-waiter lifecycle transition kind for `Semaphore`. */
export namespace SemaphoreWaiterTransitionTypeEntity {
  export const Schema = {
    'enum': ['markCancelled', 'markReady'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['markCancelled', 'markReady'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
