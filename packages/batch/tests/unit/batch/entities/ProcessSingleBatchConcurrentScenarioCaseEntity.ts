import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BatchItemsDelayMsInputEntity } from './common/BatchItemsDelayMsInputEntity.js';

/** The `process-single-batch-concurrent` scenario case shape `batch.loop.spec.ts` exercises. */
export namespace ProcessSingleBatchConcurrentScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'batches': { 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'type': 'array' },
          'executionCount': { 'type': 'number' }
        },
        'required': ['batches', 'executionCount'],
        'type': 'object'
      },
      'input': BatchItemsDelayMsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'process-single-batch-concurrent' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'batches': SchemaNode.defineArray(
            { 'type': 'array' } as const,
            SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
          ),
          'executionCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        ['batches', 'executionCount'] as const,
        { 'additionalProperties': false }
      ),
      'input': BatchItemsDelayMsInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('process-single-batch-concurrent' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
