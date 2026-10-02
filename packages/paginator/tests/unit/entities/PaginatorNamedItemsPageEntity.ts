import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** A page whose items are objects, so a retained page snapshot can be told apart from the caller-owned original. */
export namespace PaginatorNamedItemsPageEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'items': { 'items': { 'additionalProperties': false, 'properties': { 'name': { 'type': 'string' } }, 'required': ['name'], 'type': 'object' }, 'type': 'array' }
    },
    'required': ['items'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineString({ 'type': 'string' } as const) }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined)
  }, ['items'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
