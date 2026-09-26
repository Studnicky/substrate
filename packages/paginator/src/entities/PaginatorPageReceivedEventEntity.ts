import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { PaginatorAvailableCursorEntity } from './PaginatorAvailableCursorEntity.js';
import { PaginatorExhaustedCursorEntity } from './PaginatorExhaustedCursorEntity.js';

/** Serializable paginator event that records a fetched page and cursor status. */
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

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'nextCursor': SchemaNode.defineAnyOf({}, [PaginatorAvailableCursorEntity.Node, PaginatorExhaustedCursorEntity.Node]),
    'page': SchemaNode.defineUnknown({} as const),
    'type': SchemaNode.defineConst({}, 'pageReceived' as const)
  }, ['nextCursor', 'page', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
