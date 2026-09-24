import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** Statuses that represent failed outcomes. */
export namespace FailureStatusEntity {
  export const Schema = {
    'enum': ['failed', 'timeout', 'invalid', 'not_found', 'unauthorized', 'rate_limited', 'unavailable'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum(['failed', 'timeout', 'invalid', 'not_found', 'unauthorized', 'rate_limited', 'unavailable'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
