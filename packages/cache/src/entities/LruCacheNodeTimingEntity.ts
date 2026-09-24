import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace LruCacheNodeTimingEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'expiresAt': { 'minimum': 0, 'type': 'number' },
      'staleAt': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['expiresAt', 'staleAt'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'expiresAt': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'staleAt': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, ['expiresAt', 'staleAt'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
