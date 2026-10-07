import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { GpuAmdCardEntity } from './GpuAmdCardEntity.js';

/** Boundary shape of `rocm-smi --json` output: a non-empty record whose values are GPU card objects. */
export namespace GpuAmdProfileEntity {
  export const Schema = {
    'additionalProperties': GpuAmdCardEntity.Schema,
    'minProperties': 1,
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'minProperties': 1, 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': GpuAmdCardEntity.Node, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
