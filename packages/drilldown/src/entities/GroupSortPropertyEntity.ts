import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Special property names for sorting groups. */
export namespace GroupSortPropertyEntity {
  export const Schema = {
    'enum': ['$groupCount', '$groupKey'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['$groupCount', '$groupKey'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
