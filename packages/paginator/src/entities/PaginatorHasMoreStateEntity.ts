import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Serializable paginator state that retains pages and a cursor for another page. */
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

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'cursor': SchemaNode.defineUnknown({} as const),
    'pages': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineUnknown({} as const), undefined),
    'variant': SchemaNode.defineConst({}, 'hasMore' as const)
  }, ['cursor', 'pages', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
