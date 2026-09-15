import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

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
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
