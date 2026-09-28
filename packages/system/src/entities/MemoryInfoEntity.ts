import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace MemoryInfoEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'freeMb': { 'type': 'number' },
      'totalMb': { 'type': 'number' }
    },
    'required': ['freeMb', 'totalMb'],
    'title': 'MemoryInfoType',
    'type': 'object'
  } as const;
  export const Node = SchemaNode.defineObject({ 'title': 'MemoryInfoType', 'type': 'object' } as const, { 'freeMb': SchemaNode.defineNumber({ 'type': 'number' } as const), 'totalMb': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['freeMb', 'totalMb'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
