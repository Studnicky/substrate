import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Strategies for automatic value discovery during grouping. */
export namespace DiscoveryStrategyEntity {
  export const Schema = {
    'enum': ['alphabetic', 'distributive', 'quantile', 'sequential'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['alphabetic', 'distributive', 'quantile', 'sequential'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
