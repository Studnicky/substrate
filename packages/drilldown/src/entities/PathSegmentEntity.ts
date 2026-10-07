import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { GroupNodeValueEntity } from './GroupNodeValueEntity.js';

/** Single segment in a path from root to a specific node. */
export namespace PathSegmentEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'property': { 'type': 'string' },
      'value': GroupNodeValueEntity.Schema
    },
    'required': ['property', 'value'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'property': SchemaNode.defineString({ 'type': 'string' } as const), 'value': GroupNodeValueEntity.Node }, ['property', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
