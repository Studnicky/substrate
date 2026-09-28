import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { ThrottleConfigEntity } from '../../../../src/entities/ThrottleConfigEntity.js';

const throttleStatsSchema = {
  'additionalProperties': false,
  'properties': {
    'activeCount': { 'minimum': 0, 'type': 'integer' },
    'concurrencyLimit': { 'minimum': 1, 'type': 'integer' },
    'isAborted': { 'type': 'boolean' },
    'isDraining': { 'type': 'boolean' },
    'queuedCount': { 'minimum': 0, 'type': 'integer' },
    'totalExecuted': { 'minimum': 0, 'type': 'integer' }
  },
  'required': ['activeCount', 'concurrencyLimit', 'isAborted', 'isDraining', 'queuedCount', 'totalExecuted'],
  'type': 'object'
} as const;

const throttleStatsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'activeCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'concurrencyLimit': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const),
    'isAborted': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'isDraining': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'queuedCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const),
    'totalExecuted': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const)
  }, ['activeCount', 'concurrencyLimit', 'isAborted', 'isDraining', 'queuedCount', 'totalExecuted'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const batchInputSchema = {
  'additionalProperties': false,
  'properties': { 'itemCount': { 'type': 'number' }, 'maxConcurrent': { 'type': 'number' } },
  'required': ['itemCount', 'maxConcurrent'],
  'type': 'object'
} as const;

const batchInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'itemCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'maxConcurrent': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['itemCount', 'maxConcurrent'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const clockInputSchema = {
  'additionalProperties': false,
  'properties': { 'operationDurationMs': { 'type': 'number' }, 'operationSpacingMs': { 'type': 'number' }, 'startMs': { 'type': 'number' } },
  'required': ['operationDurationMs', 'operationSpacingMs', 'startMs'],
  'type': 'object'
} as const;

const clockInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'operationDurationMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'operationSpacingMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'startMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['operationDurationMs', 'operationSpacingMs', 'startMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const initialStatsSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { 'isComplete': { 'const': true }, 'stats': throttleStatsSchema },
      'required': ['isComplete', 'stats'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': { 'throttle': ThrottleConfigEntity.Schema },
      'required': ['throttle'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'initial-stats' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const initialStatsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'isComplete': SchemaNode.defineConst({}, true as const), 'stats': throttleStatsNode }, ['isComplete', 'stats'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'throttle': ThrottleConfigEntity.Node }, ['throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'initial-stats' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const isCompleteInitiallySchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': { 'additionalProperties': false, 'properties': { 'isComplete': { 'const': true } }, 'required': ['isComplete'], 'type': 'object' },
    'input': {
      'additionalProperties': false,
      'properties': { 'throttle': ThrottleConfigEntity.Schema },
      'required': ['throttle'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'is-complete-initially' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const isCompleteInitiallyNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'isComplete': SchemaNode.defineConst({}, true as const) }, ['isComplete'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'throttle': ThrottleConfigEntity.Node }, ['throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'is-complete-initially' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const adaptiveLatencyStatsSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { 'result': { 'minLength': 1, 'type': 'string' }, 'sampleCount': { 'type': 'number' } },
      'required': ['result', 'sampleCount'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': { 'result': { 'minLength': 1, 'type': 'string' }, 'throttle': ThrottleConfigEntity.Schema },
      'required': ['result', 'throttle'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'adaptive-latency-stats' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const adaptiveLatencyStatsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'sampleCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['result', 'sampleCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'throttle': ThrottleConfigEntity.Node }, ['result', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'adaptive-latency-stats' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const withAdaptiveScaleSchema = <const TShape extends string>(shape: TShape) => ({
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { 'concurrencyLimit': { 'type': 'number' }, 'resultCount': { 'type': 'number' } },
      'required': ['concurrencyLimit', 'resultCount'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': { 'batch': batchInputSchema, 'clock': clockInputSchema, 'throttle': ThrottleConfigEntity.Schema },
      'required': ['batch', 'clock', 'throttle'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': shape }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
}) as const;

const withAdaptiveScaleNode = <const TShape extends string>(shape: TShape) => SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'concurrencyLimit': SchemaNode.defineNumber({ 'type': 'number' } as const), 'resultCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['concurrencyLimit', 'resultCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': batchInputNode, 'clock': clockInputNode, 'throttle': ThrottleConfigEntity.Node }, ['batch', 'clock', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, shape)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const adaptiveScalesUpSchema = withAdaptiveScaleSchema('adaptive-scales-up');
const adaptiveScalesUpNode = withAdaptiveScaleNode('adaptive-scales-up');
const adaptiveScalesDownSchema = withAdaptiveScaleSchema('adaptive-scales-down');
const adaptiveScalesDownNode = withAdaptiveScaleNode('adaptive-scales-down');

/** The five scenario case shapes `state-management.loop.spec.ts` exercises. */
export namespace StateManagementScenarioCaseEntity {
  export const Schema = {
    'oneOf': [initialStatsSchema, isCompleteInitiallySchema, adaptiveLatencyStatsSchema, adaptiveScalesUpSchema, adaptiveScalesDownSchema]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    initialStatsNode, isCompleteInitiallyNode, adaptiveLatencyStatsNode, adaptiveScalesUpNode, adaptiveScalesDownNode
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
