import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Canonical effect payload for OperationLifecycleMachine's FireOnAcquireWait transition. */
export namespace FireOnAcquireWaitEffectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'queuedCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'variant': {
        'const': 'FireOnAcquireWait',
        'type': 'string'
      }
    },
    'required': [
      'variant',
      'queuedCount'
    ],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'queuedCount': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'variant': SchemaNode.defineConst({}, 'FireOnAcquireWait' as const) }, [
    'variant',
    'queuedCount'
  ] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
