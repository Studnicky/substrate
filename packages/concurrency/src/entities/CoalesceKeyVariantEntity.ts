import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Per-key lifecycle variant for `Coalesce`'s in-flight tracking. */
export namespace CoalesceKeyVariantEntity {
  export const Schema = {
    'enum': ['idle', 'inflight'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum(['idle', 'inflight'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
