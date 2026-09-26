import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SHAPES = [
  'failed-requests-increment', 'initial', 'reset-stats-accumulates', 'reset-stats-zero',
  'stats-frozen', 'successful-requests-increment', 'total-requests-increments', 'total-retries-counted'
] as const;

const CLASSIFIER_MODES = ['default', 'non-retryable', 'retryable'] as const;

/** The scenario case shape `retry-stats.loop.spec.ts` exercises across `Retry.getStats()`/`resetStats()`. */
export namespace RetryStatsScenarioCaseEntity {
  const statsSchema = {
    'additionalProperties': false,
    'properties': {
      'failedRequests': { 'minimum': 0, 'type': 'number' },
      'successfulRequests': { 'minimum': 0, 'type': 'number' },
      'totalRequests': { 'minimum': 0, 'type': 'number' },
      'totalRetries': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['failedRequests', 'successfulRequests', 'totalRequests', 'totalRetries'],
    'type': 'object'
  };

  const statsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'failedRequests': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
      'successfulRequests': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
      'totalRequests': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
      'totalRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
    }, ['failedRequests', 'successfulRequests', 'totalRequests', 'totalRetries'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'attempts': { 'minimum': 0, 'type': 'number' },
          'failedRequests': { 'minimum': 0, 'type': 'number' },
          'stats': statsSchema,
          'successfulRequests': { 'minimum': 0, 'type': 'number' },
          'totalRequests': { 'minimum': 0, 'type': 'number' },
          'totalRetries': { 'minimum': 0, 'type': 'number' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'calls': { 'items': { 'minLength': 1, 'type': 'string' }, 'type': 'array' },
          'classifier': { 'enum': CLASSIFIER_MODES },
          'errorMessage': { 'minLength': 1, 'type': 'string' },
          'mutatedTotalRequests': { 'type': 'number' },
          'result': { 'type': 'string' },
          'retry': {
            'additionalProperties': false,
            'properties': { 'maximumRetries': { 'minimum': 0, 'type': 'number' } },
            'required': [],
            'type': 'object'
          }
        },
        'required': ['classifier'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'attempts': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'failedRequests': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'stats': statsNode,
          'successfulRequests': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'totalRequests': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'totalRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'calls': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), undefined),
          'classifier': SchemaNode.defineEnum({}, CLASSIFIER_MODES),
          'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'mutatedTotalRequests': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'result': SchemaNode.defineString({ 'type': 'string' } as const),
          'retry': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, ['classifier'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, SHAPES)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export type Type = NodeStaticType<typeof Node>;
}
