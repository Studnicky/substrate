import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const VisibleRangeConfigSchema = {
  'additionalProperties': false,
  'properties': {
    'count': { 'type': 'number' },
    'estimateSizeMode': { 'const': 'fractional-boundary' },
    'estimateSizeValue': { 'type': 'number' },
    'itemSize': { 'type': 'number' },
    'overscan': { 'type': 'number' }
  },
  'required': ['count'],
  'type': 'object'
} as const;
const VisibleRangeConfigNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'estimateSizeMode': SchemaNode.defineConst({}, 'fractional-boundary' as const),
    'estimateSizeValue': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'overscan': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['count'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const RangeSchema = {
  'additionalProperties': false,
  'properties': { 'end': { 'type': 'number' }, 'start': { 'type': 'number' } },
  'required': ['end', 'start'],
  'type': 'object'
} as const;
const RangeNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'end': SchemaNode.defineNumber({ 'type': 'number' } as const), 'start': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['end', 'start'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const MeasurementSchema = {
  'additionalProperties': false,
  'properties': {
    'index': { 'type': 'number' },
    'readAfter': { 'type': 'boolean' },
    'size': { 'type': 'number' }
  },
  'required': ['index', 'size'],
  'type': 'object'
} as const;
const MeasurementNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'index': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'readAfter': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'size': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['index', 'size'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const MeasurementBatchSchema = {
  'additionalProperties': false,
  'properties': {
    'endExclusive': { 'type': 'number' },
    'size': { 'type': 'number' },
    'start': { 'type': 'number' }
  },
  'required': ['endExclusive', 'size', 'start'],
  'type': 'object'
} as const;
const MeasurementBatchNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'endExclusive': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'size': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'start': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['endExclusive', 'size', 'start'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The single scenario case shape `visible-range variable mode` exercises. */
export namespace VariableModeScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expect': {
        'oneOf': [
          {
            'additionalProperties': false,
            'properties': { 'range': RangeSchema, 'shape': { 'const': 'corrected-range' } },
            'required': ['range', 'shape'],
            'type': 'object'
          },
          {
            'additionalProperties': false,
            'properties': { 'range': RangeSchema, 'shape': { 'const': 'range' } },
            'required': ['range', 'shape'],
            'type': 'object'
          },
          {
            'additionalProperties': false,
            'properties': { 'shape': { 'const': 'unchanged-range' } },
            'required': ['shape'],
            'type': 'object'
          }
        ]
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'finalScrollOffset': { 'type': 'number' },
          'finalViewportSize': { 'type': 'number' },
          'measurementBatch': MeasurementBatchSchema,
          'measurements': { 'items': MeasurementSchema, 'type': 'array' },
          'scrollOffset': { 'type': 'number' },
          'viewportSize': { 'type': 'number' },
          'visibleRange': VisibleRangeConfigSchema
        },
        'required': ['visibleRange'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'initial-range',
          'interleaved-measure-corrections',
          'measure-corrects-range',
          'measure-noop-fixed-mode',
          'measure-same-size-noop',
          'overscan-applied',
          'variable-boundary-offsets',
          'variable-count-zero'
        ]
      }
    },
    'required': ['description', 'expect', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expect': SchemaNode.defineOneOf({}, [
        SchemaNode.defineObject({ 'type': 'object' } as const, { 'range': RangeNode, 'shape': SchemaNode.defineConst({}, 'corrected-range' as const) }, ['range', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        SchemaNode.defineObject({ 'type': 'object' } as const, { 'range': RangeNode, 'shape': SchemaNode.defineConst({}, 'range' as const) }, ['range', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'unchanged-range' as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      ] as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'finalScrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'finalViewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'measurementBatch': MeasurementBatchNode,
          'measurements': SchemaNode.defineArray({ 'type': 'array' } as const, MeasurementNode, undefined),
          'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'visibleRange': VisibleRangeConfigNode
        }, ['visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, [
        'initial-range',
        'interleaved-measure-corrections',
        'measure-corrects-range',
        'measure-noop-fixed-mode',
        'measure-same-size-noop',
        'overscan-applied',
        'variable-boundary-offsets',
        'variable-count-zero'
      ] as const)
    }, ['description', 'expect', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
