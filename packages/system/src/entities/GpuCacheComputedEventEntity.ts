import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { GpuInfoEntity } from './GpuInfoEntity.js';

/**
 * Reports the result of a GPU detection probe. Legal only from `uncomputed`
 * — the cache is write-once, mirroring the old `#gpuCache === undefined`
 * guard that made `PROVIDER.detectGpu()` run at most once per process.
 */
export namespace GpuCacheComputedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'detected': { 'oneOf': [GpuInfoEntity.Schema, { 'type': 'null' }] },
      'type': { 'const': 'computed', 'type': 'string' }
    },
    'required': ['detected', 'type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'detected': SchemaNode.defineOneOf({}, [GpuInfoEntity.Node, SchemaNode.defineNull({ 'type': 'null' } as const)]), 'type': SchemaNode.defineConst({}, 'computed' as const) }, ['detected', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
