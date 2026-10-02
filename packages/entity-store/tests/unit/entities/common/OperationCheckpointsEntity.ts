import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { StoreCheckpointEntity } from './StoreCheckpointEntity.js';

/** Store checkpoints recorded before and after add/batch operations. */
export namespace OperationCheckpointsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'afterAdd': StoreCheckpointEntity.Schema,
      'afterBatch': StoreCheckpointEntity.Schema,
      'initial': StoreCheckpointEntity.Schema
    },
    'required': ['afterAdd', 'afterBatch', 'initial'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'afterAdd': StoreCheckpointEntity.Node,
    'afterBatch': StoreCheckpointEntity.Node,
    'initial': StoreCheckpointEntity.Node
  }, ['afterAdd', 'afterBatch', 'initial'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
