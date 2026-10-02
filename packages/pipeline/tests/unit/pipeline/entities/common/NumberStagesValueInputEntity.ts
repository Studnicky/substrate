import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { NumberStageSpecEntity } from './NumberStageSpecEntity.js';

/** The `{stages, value}` input shape `async-observer-has-no-effect` and `hanging-observer-has-no-effect` exercise. */
export namespace NumberStagesValueInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'stages': { 'items': NumberStageSpecEntity.Schema, 'type': 'array' },
      'value': { 'type': 'number' }
    },
    'required': ['stages', 'value'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'stages': SchemaNode.defineArray({ 'type': 'array' } as const, NumberStageSpecEntity.Node, undefined),
    'value': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['stages', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
