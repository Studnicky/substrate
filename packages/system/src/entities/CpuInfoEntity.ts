import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace CpuInfoEntity {
  export const Schema = { 'additionalProperties': false, 'properties': { 'arch': { 'type': 'string' }, 'logicalCount': { 'type': 'number' }, 'model': { 'type': 'string' }, 'physicalCount': { 'type': 'number' } }, 'required': ['arch', 'logicalCount', 'model', 'physicalCount'], 'title': 'CpuInfoType', 'type': 'object' } as const;

  export const Node = SchemaNode.defineObject({ 'title': 'CpuInfoType', 'type': 'object' } as const, { 'arch': SchemaNode.defineString({ 'type': 'string' } as const), 'logicalCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'model': SchemaNode.defineString({ 'type': 'string' } as const), 'physicalCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['arch', 'logicalCount', 'model', 'physicalCount'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
