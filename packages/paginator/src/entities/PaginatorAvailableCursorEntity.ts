import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Serializable cursor input that provides another cursor value. */
export namespace PaginatorAvailableCursorEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cursor': {},
      'exhausted': { 'const': false, 'type': 'boolean' }
    },
    'required': ['cursor', 'exhausted'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'cursor': SchemaNode.defineUnknown({} as const),
    'exhausted': SchemaNode.defineConst({}, false as const)
  }, ['cursor', 'exhausted'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
