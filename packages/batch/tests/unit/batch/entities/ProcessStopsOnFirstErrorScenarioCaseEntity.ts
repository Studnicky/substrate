import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BatchItemsErrorInputEntity } from './common/BatchItemsErrorInputEntity.js';

/** The `process-stops-on-first-error` scenario case shape `batch.loop.spec.ts` exercises. */
export namespace ProcessStopsOnFirstErrorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'batches': { 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'type': 'array' },
          'processed': { 'items': { 'type': 'number' }, 'type': 'array' },
          'rejectedMessage': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['batches', 'processed', 'rejectedMessage'],
        'type': 'object'
      },
      'input': BatchItemsErrorInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'process-stops-on-first-error' }
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
          'processed': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
          'rejectedMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['batches', 'processed', 'rejectedMessage'] as const,
        { 'additionalProperties': false }
      ),
      'input': BatchItemsErrorInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('process-stops-on-first-error' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
