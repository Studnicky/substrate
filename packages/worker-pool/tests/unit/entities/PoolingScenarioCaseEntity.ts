import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The single `reuses-workers` scenario case shape `pooling.loop.spec.ts` exercises. */
export namespace PoolingScenarioCaseEntity {
  const batchConfigSchema = {
    'additionalProperties': false,
    'properties': { 'concurrency': { 'type': 'number' } },
    'required': [],
    'type': 'object'
  } as const;

  const workerPoolConfigSchema = {
    'additionalProperties': false,
    'properties': { 'batch': batchConfigSchema, 'concurrency': { 'type': 'number' }, 'workerPath': { 'type': 'string' } },
    'required': ['concurrency', 'workerPath'],
    'type': 'object'
  } as const;

  const workloadBatchSchema = {
    'additionalProperties': false,
    'properties': { 'itemCount': { 'type': 'number' }, 'itemMs': { 'type': 'number' }, 'valuePrefix': { 'type': 'string' } },
    'required': ['itemCount', 'itemMs', 'valuePrefix'],
    'type': 'object'
  } as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'distinctThreadIdsLessThanItemCount': { 'type': 'boolean' },
          'distinctThreadIdsLessThanOrEqualConcurrency': { 'type': 'boolean' },
          'resultLength': { 'type': 'number' },
          'results': { 'items': { 'type': 'string' }, 'type': 'array' }
        },
        'required': ['distinctThreadIdsLessThanItemCount', 'distinctThreadIdsLessThanOrEqualConcurrency', 'resultLength', 'results'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'batch': workloadBatchSchema, 'workerPool': workerPoolConfigSchema },
        'required': ['batch', 'workerPool'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'reuses-workers' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const BatchConfigNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'concurrency': SchemaNode.defineNumber({ 'type': 'number' } as const) },
    [] as const,
    { 'additionalProperties': false }
  );

  const WorkerPoolConfigNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'batch': BatchConfigNode,
      'concurrency': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'workerPath': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['concurrency', 'workerPath'] as const,
    { 'additionalProperties': false }
  );

  const WorkloadBatchNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'itemCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'itemMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'valuePrefix': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['itemCount', 'itemMs', 'valuePrefix'] as const,
    { 'additionalProperties': false }
  );

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'distinctThreadIdsLessThanItemCount': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'distinctThreadIdsLessThanOrEqualConcurrency': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'resultLength': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const))
        },
        ['distinctThreadIdsLessThanItemCount', 'distinctThreadIdsLessThanOrEqualConcurrency', 'resultLength', 'results'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'batch': WorkloadBatchNode, 'workerPool': WorkerPoolConfigNode },
        ['batch', 'workerPool'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('reuses-workers' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
