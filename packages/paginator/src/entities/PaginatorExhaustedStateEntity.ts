import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Serializable paginator state after its source has been exhausted. */
export namespace PaginatorExhaustedStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'pages': { 'items': {}, 'type': 'array' },
      'variant': { 'const': 'exhausted', 'type': 'string' }
    },
    'required': ['pages', 'variant'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'pages': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineUnknown({} as const), undefined),
    'variant': SchemaNode.defineConst({}, 'exhausted' as const)
  }, ['pages', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
