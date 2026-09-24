import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { GranularityOptionsEntity } from './GranularityOptionsEntity.js';
import { NodeBudgetEntity } from './NodeBudgetEntity.js';

/** Shared mutable state threaded through one grouping pass. */
export namespace EngineContextEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'budget': NodeBudgetEntity.Schema,
      'granularity': GranularityOptionsEntity.Schema,
      'maximumDepth': { 'type': 'integer' },
      'maximumNodes': { 'type': 'integer' },
      'minimumGroupSize': { 'type': 'integer' }
    },
    'required': ['budget', 'minimumGroupSize'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'budget': NodeBudgetEntity.Node, 'granularity': GranularityOptionsEntity.Node, 'maximumDepth': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'maximumNodes': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'minimumGroupSize': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, ['budget', 'minimumGroupSize'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
