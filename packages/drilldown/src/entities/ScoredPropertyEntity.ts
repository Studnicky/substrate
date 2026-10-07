import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** A property's computed grouping suitability score. */
export namespace ScoredPropertyEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cardinality': { 'type': 'integer' },
      'property': { 'type': 'string' },
      'score': { 'type': 'number' }
    },
    'required': ['cardinality', 'property', 'score'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cardinality': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'property': SchemaNode.defineString({ 'type': 'string' } as const), 'score': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['cardinality', 'property', 'score'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
