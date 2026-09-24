import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { FilterOperatorEntity } from './FilterOperatorEntity.js';

/** Filter rule matching records by exact property values. */
export namespace ValueFilterRuleEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'operator': FilterOperatorEntity.Schema,
      'property': { 'type': 'string' },
      'type': { 'const': 'value' },
      'values': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': ['operator', 'property', 'type', 'values'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'operator': FilterOperatorEntity.Node, 'property': SchemaNode.defineString({ 'type': 'string' } as const), 'type': SchemaNode.defineConst('value' as const), 'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)) }, ['operator', 'property', 'type', 'values'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
