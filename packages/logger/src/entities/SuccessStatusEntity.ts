import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** Statuses that represent successful outcomes. */
export namespace SuccessStatusEntity {
  export const Schema = {
    'enum': ['success', 'partial', 'cached', 'skipped'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['success', 'partial', 'cached', 'skipped'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
