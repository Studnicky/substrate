import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { BatchItemsDelayMsInputEntity } from './common/BatchItemsDelayMsInputEntity.js';

/** The `process-waits-for-batch-completion` scenario case shape `batch.loop.spec.ts` exercises. */
export namespace ProcessWaitsForBatchCompletionScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'batchCount': { 'type': 'number' }, 'minimumGapMs': { 'type': 'number' } },
        'required': ['batchCount', 'minimumGapMs'],
        'type': 'object'
      },
      'input': BatchItemsDelayMsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'process-waits-for-batch-completion' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'batchCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'minimumGapMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['batchCount', 'minimumGapMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': BatchItemsDelayMsInputEntity.Node,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'process-waits-for-batch-completion' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
