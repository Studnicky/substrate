import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace BatchStatsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'failed': { 'minimum': 0, 'type': 'integer' },
      'succeeded': { 'minimum': 0, 'type': 'integer' },
      'total': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['failed', 'succeeded', 'total'],
    'type': 'object'
  } as const;

  /** Aggregate completion statistics emitted by the onBatchComplete hook. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'failed': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'succeeded': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'total': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) }, ['failed', 'succeeded', 'total'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
