import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** A cursor that is itself an object, so a snapshot retained by a hook can be told apart from the caller-owned original. */
export namespace PaginatorObjectCursorEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'token': { 'additionalProperties': false, 'properties': { 'value': { 'type': 'string' } }, 'required': ['value'], 'type': 'object' }
    },
    'required': ['token'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'token': SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': SchemaNode.defineString({ 'type': 'string' } as const) }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  }, ['token'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
