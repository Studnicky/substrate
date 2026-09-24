import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { GpuInfoEntity } from './GpuInfoEntity.js';

/** GPU detection has been probed and found a GPU; carries the raw detection result. */
export namespace GpuCacheComputedValueStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'gpu': GpuInfoEntity.Schema,
      'variant': { 'const': 'computed-value', 'type': 'string' }
    },
    'required': ['gpu', 'variant'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'gpu': GpuInfoEntity.Node, 'variant': SchemaNode.defineConst('computed-value' as const) }, ['gpu', 'variant'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
