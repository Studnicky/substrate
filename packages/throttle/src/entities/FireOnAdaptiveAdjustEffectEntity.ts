import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical effect payload for OperationLifecycleMachine's FireOnAdaptiveAdjust transition. */
export namespace FireOnAdaptiveAdjustEffectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'newLimit': {
        'minimum': 0,
        'type': 'integer'
      },
      'previousLimit': {
        'minimum': 0,
        'type': 'integer'
      },
      'variant': {
        'const': 'FireOnAdaptiveAdjust',
        'type': 'string'
      }
    },
    'required': [
      'variant',
      'newLimit',
      'previousLimit'
    ],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'newLimit': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'previousLimit': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'variant': SchemaNode.defineConst('FireOnAdaptiveAdjust' as const) }, [
    'variant',
    'newLimit',
    'previousLimit'
  ] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
