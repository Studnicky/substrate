import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace FileLockInspectionEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'lockPath': { 'minLength': 1, 'type': 'string' },
      'originalPath': { 'minLength': 1, 'type': 'string' },
      'ownerToken': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['lockPath', 'originalPath', 'ownerToken'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'lockPath': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'originalPath': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'ownerToken': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['lockPath', 'originalPath', 'ownerToken'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
