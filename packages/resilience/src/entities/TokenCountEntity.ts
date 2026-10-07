import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Positive token count `TokenBucket`/`KeyedRateLimiter` consume per call. Defaults to one token when omitted. */
export namespace TokenCountEntity {
  export const Schema = { 'default': 1, 'exclusiveMinimum': 0, 'type': 'number' } as const;

  export const Node = SchemaNode.defineNumber(Schema);
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
