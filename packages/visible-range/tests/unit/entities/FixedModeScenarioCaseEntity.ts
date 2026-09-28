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

/** The single scenario case shape `visible-range fixed mode` exercises. */
export namespace FixedModeScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expect': {
        'oneOf': [
          {
            'additionalProperties': false,
            'properties': { 'range': RangeSchema, 'shape': { 'const': 'range' } },
            'required': ['range', 'shape'],
            'type': 'object'
          },
          {
            'additionalProperties': false,
            'properties': { 'shape': { 'const': 'range-end' }, 'value': { 'type': 'number' } },
            'required': ['shape', 'value'],
            'type': 'object'
          },
          {
            'additionalProperties': false,
            'properties': { 'shape': { 'const': 'range-start' }, 'value': { 'type': 'number' } },
            'required': ['shape', 'value'],
            'type': 'object'
          }
        ]
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'scrollOffset': { 'type': 'number' },
          'viewportSize': { 'type': 'number' },
          'visibleRange': VisibleRangeConfigSchema
        },
        'required': ['visibleRange'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': ['range', 'range-end', 'range-start'] }
    },
    'required': ['description', 'expect', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expect': SchemaNode.defineOneOf({}, [
        SchemaNode.defineObject({ 'type': 'object' } as const, { 'range': RangeNode, 'shape': SchemaNode.defineConst({}, 'range' as const) }, ['range', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'range-end' as const), 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['shape', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'range-start' as const), 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['shape', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      ] as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'visibleRange': VisibleRangeConfigNode
        }, ['visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, ['range', 'range-end', 'range-start'] as const)
    }, ['description', 'expect', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
