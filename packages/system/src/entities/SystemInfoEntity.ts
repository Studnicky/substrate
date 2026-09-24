import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { CpuInfoEntity } from './CpuInfoEntity.js';
import { GpuInfoEntity } from './GpuInfoEntity.js';
import { MemoryInfoEntity } from './MemoryInfoEntity.js';
import { PlatformInfoEntity } from './PlatformInfoEntity.js';

export namespace SystemInfoEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cpu': CpuInfoEntity.Schema,
      'gpu': { 'oneOf': [GpuInfoEntity.Schema, { 'type': 'null' }] },
      'memory': MemoryInfoEntity.Schema,
      'platform': PlatformInfoEntity.Schema
    },
    'required': ['cpu', 'gpu', 'memory', 'platform'],
    'title': 'SystemInfoType',
    'type': 'object'
  } as const;
  export const Node = SchemaNode.defineObject({ 'title': 'SystemInfoType', 'type': 'object' } as const, { 'cpu': CpuInfoEntity.Node, 'gpu': SchemaNode.defineOneOf([GpuInfoEntity.Node, SchemaNode.defineNull({ 'type': 'null' } as const)]), 'memory': MemoryInfoEntity.Node, 'platform': PlatformInfoEntity.Node }, ['cpu', 'gpu', 'memory', 'platform'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
