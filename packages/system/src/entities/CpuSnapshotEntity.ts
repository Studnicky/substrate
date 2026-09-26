import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace CpuSnapshotEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'logicalCount': { 'type': 'number' },
      'model': { 'type': 'string' },
      'physicalCount': { 'type': 'number' }
    },
    'required': ['logicalCount', 'model', 'physicalCount'],
    'title': 'CpuSnapshotType',
    'type': 'object'
  } as const;
  export const Node = SchemaNode.defineObject({ 'title': 'CpuSnapshotType', 'type': 'object' } as const, { 'logicalCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'model': SchemaNode.defineString({ 'type': 'string' } as const), 'physicalCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['logicalCount', 'model', 'physicalCount'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
