/**
 * Reports the result of a GPU detection probe. Legal only from `uncomputed`
 * — the cache is write-once, mirroring the old `#gpuCache === undefined`
 * guard that made `PROVIDER.detectGpu()` run at most once per process.
 */
import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { GpuInfoEntity } from './GpuInfoEntity.js';

export namespace GpuCacheComputedEventEntity {
  export const Schema = { 'additionalProperties': false, 'properties': { 'detected': { 'oneOf': [GpuInfoEntity.Schema, { 'type': 'null' }] }, 'type': { 'const': 'computed', 'type': 'string' } }, 'required': ['detected', 'type'], 'type': 'object' } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'detected': SchemaNode.defineOneOf({} as const, [GpuInfoEntity.Node, SchemaNode.defineNull({ 'type': 'null' } as const)]), 'type': SchemaNode.defineConst({ 'type': 'string' } as const, 'computed') }, ['detected', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
