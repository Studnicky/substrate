import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { PaginatorAvailableCursorEntity } from './PaginatorAvailableCursorEntity.js';
import { PaginatorExhaustedCursorEntity } from './PaginatorExhaustedCursorEntity.js';

export namespace PaginatorPageReceivedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'nextCursor': {
        'anyOf': [PaginatorAvailableCursorEntity.Schema, PaginatorExhaustedCursorEntity.Schema]
      },
      'page': {},
      'type': { 'const': 'pageReceived', 'type': 'string' }
    },
    'required': ['nextCursor', 'page', 'type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'nextCursor': SchemaNode.defineAnyOf({} as const, [PaginatorAvailableCursorEntity.Node, PaginatorExhaustedCursorEntity.Node]), 'page': SchemaNode.defineUnknown({} as const), 'type': SchemaNode.defineConst({ 'type': 'string' } as const, 'pageReceived') }, ['nextCursor', 'page', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
