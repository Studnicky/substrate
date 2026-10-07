import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Filter mode determining whether matched values are kept or removed. */
export namespace FilterOperatorEntity {
  export const Schema = {
    'enum': ['exclude', 'include'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['exclude', 'include'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
