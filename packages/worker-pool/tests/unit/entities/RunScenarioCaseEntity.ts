import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `run.loop.spec.ts` scenario case shape. `input`/`expected` list every field used across the six shapes, each optional — each shape reads its own subset directly, never a cast. */
export namespace RunScenarioCaseEntity {
  const batchConfigSchema = {
    'additionalProperties': false,
    'properties': { 'concurrency': { 'type': 'number' } },
    'required': [],
    'type': 'object'
  } as const;

  const workerPoolConfigSchema = {
    'additionalProperties': false,
    'properties': {
      'batch': batchConfigSchema,
      'concurrency': { 'type': 'number' },
      'timeoutMs': { 'type': 'number' },
      'workerPath': { 'type': 'string' }
    },
    'required': ['concurrency', 'workerPath'],
    'type': 'object'
  } as const;

  const itemSchema = {
    'additionalProperties': false,
    'properties': {
      'awaitResultCount': { 'type': 'number' },
      'error': { 'type': 'string' },
      'exit': { 'type': 'boolean' },
      'ms': { 'type': 'number' },
      'stateFile': { 'type': 'string' },
      'value': { 'type': 'string' }
    },
    'required': ['value'],
    'type': 'object'
  } as const;

  const boundedConcurrencyBatchSchema = {
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
          'createdWorkerCount': { 'type': 'number' },
          'itemCount': { 'type': 'number' },
          'observedMaxGreaterThanOne': { 'const': true },
          'observedMaxLessThanOrEqualConcurrency': { 'const': true },
          'observedResults': { 'items': { 'type': 'string' }, 'type': 'array' },
          'results': { 'items': { 'type': 'string' }, 'type': 'array' },
          'runRejectedMessageIncludes': { 'type': 'string' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'batch': boundedConcurrencyBatchSchema, 'items': { 'items': itemSchema, 'type': 'array' }, 'workerPool': workerPoolConfigSchema },
        'required': ['workerPool'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': ['result-order', 'bounded-concurrency', 'error-fail-fast', 'exit-retry', 'exit-retry-fails', 'timeout-rejects']
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const BatchConfigNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'concurrency': SchemaNode.defineNumber({ 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const WorkerPoolConfigNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'batch': BatchConfigNode,
      'concurrency': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'workerPath': SchemaNode.defineString({ 'type': 'string' } as const)
    }, ['concurrency', 'workerPath'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const ItemNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'awaitResultCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'error': SchemaNode.defineString({ 'type': 'string' } as const),
      'exit': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'ms': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'stateFile': SchemaNode.defineString({ 'type': 'string' } as const),
      'value': SchemaNode.defineString({ 'type': 'string' } as const)
    }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const BoundedConcurrencyBatchNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'itemCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'itemMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'valuePrefix': SchemaNode.defineString({ 'type': 'string' } as const)
    }, ['itemCount', 'itemMs', 'valuePrefix'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'createdWorkerCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'observedMaxGreaterThanOne': SchemaNode.defineConst({}, true as const),
          'observedMaxLessThanOrEqualConcurrency': SchemaNode.defineConst({}, true as const),
          'observedResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'runRejectedMessageIncludes': SchemaNode.defineString({ 'type': 'string' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'batch': BoundedConcurrencyBatchNode,
          'items': SchemaNode.defineArray({ 'type': 'array' } as const, ItemNode, undefined),
          'workerPool': WorkerPoolConfigNode
        }, ['workerPool'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, [
        'result-order', 'bounded-concurrency', 'error-fail-fast', 'exit-retry', 'exit-retry-fails', 'timeout-rejects'
      ] as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
