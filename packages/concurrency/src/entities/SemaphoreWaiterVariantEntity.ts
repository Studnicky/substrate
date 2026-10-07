import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Per-waiter lifecycle variant for a queued semaphore acquisition. */
export namespace SemaphoreWaiterVariantEntity {
  export const Schema = {
    'enum': ['queued', 'ready', 'cancelled'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['queued', 'ready', 'cancelled'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
