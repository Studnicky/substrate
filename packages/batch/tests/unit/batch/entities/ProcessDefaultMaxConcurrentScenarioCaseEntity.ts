import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BatchItemsInputEntity } from './common/BatchItemsInputEntity.js';

/** The `process-default-max-concurrent` scenario case shape `batch.loop.spec.ts` exercises. */
export namespace ProcessDefaultMaxConcurrentScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'defaultMaxConcurrent': { 'type': 'number' }, 'maxConcurrentObserved': { 'type': 'number' } },
        'required': ['defaultMaxConcurrent', 'maxConcurrentObserved'],
        'type': 'object'
      },
      'input': BatchItemsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'process-default-max-concurrent' }
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
          'defaultMaxConcurrent': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'maxConcurrentObserved': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        ['defaultMaxConcurrent', 'maxConcurrentObserved'] as const,
        { 'additionalProperties': false }
      ),
      'input': BatchItemsInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('process-default-max-concurrent' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
