import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BatchStringItemsInputEntity } from './common/BatchStringItemsInputEntity.js';

/** The `process-settled-indices` scenario case shape `batchHooks.loop.spec.ts` exercises. */
export namespace ProcessSettledIndicesScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'sortedIndices': { 'items': { 'type': 'number' }, 'type': 'array' },
          'sortedResults': { 'items': { 'type': 'string' }, 'type': 'array' },
          'sortedSettledIndices': { 'items': { 'type': 'number' }, 'type': 'array' }
        },
        'required': ['sortedIndices', 'sortedResults', 'sortedSettledIndices'],
        'type': 'object'
      },
      'input': BatchStringItemsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'process-settled-indices' }
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
          'sortedIndices': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
          'sortedResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'sortedSettledIndices': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
        },
        ['sortedIndices', 'sortedResults', 'sortedSettledIndices'] as const,
        { 'additionalProperties': false }
      ),
      'input': BatchStringItemsInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('process-settled-indices' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
