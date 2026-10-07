import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace GpuInfoEntity {
  export const Schema = { 'additionalProperties': false, 'properties': { 'computeApi': { 'enum': ['cuda', 'metal', 'opencl', 'software'], 'type': 'string' }, 'name': { 'type': 'string' }, 'vramMb': { 'type': ['number', 'null'] } }, 'required': ['computeApi', 'name', 'vramMb'], 'title': 'GpuInfoType', 'type': 'object' } as const;

  export const Node = SchemaNode.defineObject({ 'title': 'GpuInfoType', 'type': 'object' } as const, { 'computeApi': SchemaNode.defineEnum({ 'type': 'string' } as const, ['cuda', 'metal', 'opencl', 'software'] as const), 'name': SchemaNode.defineString({ 'type': 'string' } as const), 'vramMb': SchemaNode.defineAnyOf({} as const, [SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)]) }, ['computeApi', 'name', 'vramMb'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
