import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Requested transition kind for `Semaphore`'s waiter-granting reentrancy guard. */
export namespace SemaphoreGrantTransitionTypeEntity {
  export const Schema = {
    'enum': ['finish', 'start'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['finish', 'start'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
