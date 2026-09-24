import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical effect payload for OperationLifecycleMachine's FireOnAbortStart transition. */
export namespace FireOnAbortStartEffectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cancelledCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'variant': {
        'const': 'FireOnAbortStart',
        'type': 'string'
      }
    },
    'required': [
      'variant',
      'cancelledCount'
    ],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cancelledCount': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'variant': SchemaNode.defineConst('FireOnAbortStart' as const) }, [
    'variant',
    'cancelledCount'
  ] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
