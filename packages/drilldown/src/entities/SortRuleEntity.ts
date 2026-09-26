import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { SortDirectionEntity } from './SortDirectionEntity.js';

/** Rule specifying how to sort records or groups. */
export namespace SortRuleEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'direction': SortDirectionEntity.Schema,
      'property': { 'type': 'string' }
    },
    'required': ['direction', 'property'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'direction': SortDirectionEntity.Node, 'property': SchemaNode.defineString({ 'type': 'string' } as const) }, ['direction', 'property'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
