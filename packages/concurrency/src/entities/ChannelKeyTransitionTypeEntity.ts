import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Requested per-key lifecycle transition kind for `Channel`. */
export namespace ChannelKeyTransitionTypeEntity {
  export const Schema = {
    'enum': ['close', 'subscribe', 'unsubscribe'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['close', 'subscribe', 'unsubscribe'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
