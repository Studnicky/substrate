import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical effect payload for OperationLifecycleMachine's FireOnRelease transition. */
export namespace FireOnReleaseEffectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'activeCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'totalExecuted': {
        'minimum': 0,
        'type': 'integer'
      },
      'variant': {
        'const': 'FireOnRelease',
        'type': 'string'
      }
    },
    'required': [
      'variant',
      'activeCount',
      'totalExecuted'
    ],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeCount': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'totalExecuted': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'variant': SchemaNode.defineConst('FireOnRelease' as const) }, [
    'variant',
    'activeCount',
    'totalExecuted'
  ] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
