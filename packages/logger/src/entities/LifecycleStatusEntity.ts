import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** Statuses that represent operation lifecycle states. */
export namespace LifecycleStatusEntity {
  export const Schema = {
    'enum': ['pending', 'in_progress', 'complete'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum(['pending', 'in_progress', 'complete'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
