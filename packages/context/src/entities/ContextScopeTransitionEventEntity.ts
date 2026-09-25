import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ContextScopeVariantEntity } from './ContextScopeVariantEntity.js';

/** Canonical lifecycle transition request for a Context scope. */
export namespace ContextScopeTransitionEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'to': ContextScopeVariantEntity.Schema,
      'type': { 'const': 'transitionTo', 'type': 'string' }
    },
    'required': ['to', 'type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'to': ContextScopeVariantEntity.Node, 'type': SchemaNode.defineConst('transitionTo' as const) }, ['to', 'type'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
