import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Requested per-key lifecycle transition kind for `Coalesce`. */
export namespace CoalesceKeyTransitionTypeEntity {
  export const Schema = {
    'enum': ['settle', 'start'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['settle', 'start'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
