import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Canonical effect payload for OperationLifecycleMachine's FireOnDrainComplete transition. */
export namespace FireOnDrainCompleteEffectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'totalExecuted': {
        'minimum': 0,
        'type': 'integer'
      },
      'variant': {
        'const': 'FireOnDrainComplete',
        'type': 'string'
      }
    },
    'required': [
      'variant',
      'totalExecuted'
    ],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'totalExecuted': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'variant': SchemaNode.defineConst({}, 'FireOnDrainComplete' as const) }, [
    'variant',
    'totalExecuted'
  ] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
