/** GPU detection has been probed and found a GPU; carries the raw detection result. */
import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { GpuInfoEntity } from './GpuInfoEntity.js';

export namespace GpuCacheComputedValueStateEntity {
  export const Schema = { 'additionalProperties': false, 'properties': { 'gpu': GpuInfoEntity.Schema, 'variant': { 'const': 'computed-value', 'type': 'string' } }, 'required': ['gpu', 'variant'], 'type': 'object' } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'gpu': GpuInfoEntity.Node, 'variant': SchemaNode.defineConst({ 'type': 'string' } as const, 'computed-value') }, ['gpu', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
