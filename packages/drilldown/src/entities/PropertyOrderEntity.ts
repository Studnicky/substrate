import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { PropertyPathEntity } from './PropertyPathEntity.js';

/** Ordered list of property paths selected for progressive multi-level grouping. */
export namespace PropertyOrderEntity {
  export const Schema = {
    'items': PropertyPathEntity.Schema,
    'type': 'array'
  } as const;

  export const Node = SchemaNode.defineArray({ 'type': 'array' } as const, PropertyPathEntity.Node);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
