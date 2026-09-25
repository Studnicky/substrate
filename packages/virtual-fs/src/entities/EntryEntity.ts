import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace EntryEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'mtimeMs': { 'type': 'number' },
      'shape': { 'enum': ['directory', 'file'], 'type': 'string' }
    },
    'required': ['mtimeMs', 'shape'],
    'type': 'object'
  } as const;

  /** Internal directory/file entry metadata tracked by `VirtualFileSystem`. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'mtimeMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'shape': SchemaNode.defineEnum(['directory', 'file'] as const) }, ['mtimeMs', 'shape'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
