import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Cancel the in-flight entry (if any) and release every backpressure/drain waiter. Fires exactly once, on the transition that first requests abort. */
export namespace BusQueueReleaseForAbortEffectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'variant': { 'const': 'releaseForAbort' }
    },
    'required': ['variant'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'variant': SchemaNode.defineConst({}, 'releaseForAbort' as const) }, ['variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
