import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** Parsed JSON emitted by `system_profiler SPDisplaysDataType -json`. */
export namespace GpuMetalProfileEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'SPDisplaysDataType': {
        'items': {
          'additionalProperties': false,
          'properties': {
            'spdisplays_vram': { 'type': ['number', 'string'] },
            'sppci_model': { 'type': ['number', 'string'] }
          },
          'type': 'object'
        },
        'minItems': 1,
        'type': 'array'
      }
    },
    'required': ['SPDisplaysDataType'],
    'title': 'GpuMetalProfile',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'title': 'GpuMetalProfile', 'type': 'object' } as const, { 'SPDisplaysDataType': SchemaNode.defineArray({ 'minItems': 1, 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, { 'spdisplays_vram': SchemaNode.defineAnyOf([SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineString({ 'type': 'string' } as const)]), 'sppci_model': SchemaNode.defineAnyOf([SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineString({ 'type': 'string' } as const)]) }, [] as const, { 'additionalProperties': false })) }, ['SPDisplaysDataType'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
