import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { BatchItemsErrorItemsInputEntity } from './common/BatchItemsErrorItemsInputEntity.js';
import { BatchStatsExpectedEntity } from './common/BatchStatsExpectedEntity.js';

/** The `process-settled-batch-complete` scenario case shape `batchHooks.loop.spec.ts` exercises. */
export namespace ProcessSettledBatchCompleteScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'batchCompleteCount': { 'type': 'number' },
          'rejectedMessage': { 'minLength': 1, 'type': 'string' },
          'stats': BatchStatsExpectedEntity.Schema
        },
        'required': ['batchCompleteCount', 'rejectedMessage', 'stats'],
        'type': 'object'
      },
      'input': BatchItemsErrorItemsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'process-settled-batch-complete' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'batchCompleteCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'rejectedMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'stats': BatchStatsExpectedEntity.Node
    }, ['batchCompleteCount', 'rejectedMessage', 'stats'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': BatchItemsErrorItemsInputEntity.Node,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'process-settled-batch-complete' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
