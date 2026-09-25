import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical effect payload for OperationLifecycleMachine's FireOnContended transition. */
export namespace FireOnContendedEffectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'activeCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'queuedCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'variant': {
        'const': 'FireOnContended',
        'type': 'string'
      }
    },
    'required': [
      'variant',
      'activeCount',
      'queuedCount'
    ],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeCount': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'queuedCount': SchemaNode.defineNumber({
    'minimum': 0,
    'type': 'integer'
  } as const), 'variant': SchemaNode.defineConst('FireOnContended' as const) }, [
    'variant',
    'activeCount',
    'queuedCount'
  ] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
