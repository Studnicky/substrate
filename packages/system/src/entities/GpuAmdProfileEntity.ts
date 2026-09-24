import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** Parsed JSON emitted by `rocm-smi --showmeminfo vram --json`. */
export namespace GpuAmdProfileEntity {
  export const Schema = {
    'additionalProperties': false,
    'minProperties': 1,
    'patternProperties': {
      '.*': {
        'additionalProperties': false,
        'properties': {
          'VRAM Total Memory (B)': { 'type': ['number', 'string'] }
        },
        'type': 'object'
      }
    },
    'title': 'GpuAmdProfile',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'minProperties': 1, 'title': 'GpuAmdProfile', 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': false, 'patternProperties': { '.*': SchemaNode.defineObject({ 'type': 'object' } as const, { 'VRAM Total Memory (B)': SchemaNode.defineAnyOf([SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineString({ 'type': 'string' } as const)]) }, [] as const, { 'additionalProperties': false }) } });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
