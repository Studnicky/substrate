import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Reentrancy-guard variant for `Semaphore`'s waiter-granting loop. */
export namespace SemaphoreGrantVariantEntity {
  export const Schema = {
    'enum': ['idle', 'granting'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['idle', 'granting'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
