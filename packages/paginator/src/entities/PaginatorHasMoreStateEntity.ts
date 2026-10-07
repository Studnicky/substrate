import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace PaginatorHasMoreStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cursor': {},
      'pages': { 'items': {}, 'type': 'array' },
      'variant': { 'const': 'hasMore', 'type': 'string' }
    },
    'required': ['cursor', 'pages', 'variant'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cursor': SchemaNode.defineUnknown({} as const), 'pages': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineUnknown({} as const), undefined), 'variant': SchemaNode.defineConst({ 'type': 'string' } as const, 'hasMore') }, ['cursor', 'pages', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
