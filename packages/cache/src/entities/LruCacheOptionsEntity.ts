import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace LruCacheOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'capacity': { 'minimum': 1, 'type': 'integer' },
      'staleMs': { 'minimum': 0, 'type': 'number' },
      'ttlMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['capacity'],
    'type': 'object'
  } as const;

  /** Construction options for {@link LruCache}. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'capacity': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'staleMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'ttlMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, ['capacity'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  /** Not-yet-validated construction options for {@link LruCache} — the shape `LruCache.create`'s caller supplies. */
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
