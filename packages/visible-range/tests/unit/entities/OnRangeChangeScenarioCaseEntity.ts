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
const VisibleRangeConfigNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'estimateSizeMode': SchemaNode.defineConst('fractional-boundary' as const),
    'estimateSizeValue': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'overscan': SchemaNode.defineNumber({ 'type': 'number' } as const)
  },
  ['count'] as const,
  { 'additionalProperties': false }
);

/** The single scenario case shape `visible-range onRangeChange` exercises. */
export namespace OnRangeChangeScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'input': {
        'additionalProperties': false,
        'properties': {
          'nextScrollOffset': { 'type': 'number' },
          'scrollOffset': { 'type': 'number' },
          'viewportSize': { 'type': 'number' },
          'visibleRange': VisibleRangeConfigSchema
        },
        'required': ['visibleRange'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': ['async-rejecting-hook', 'first-call', 'no-state-change', 'retained-state-isolated', 'scroll-moves-range', 'throwing-hook']
      }
    },
    'required': ['description', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'nextScrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'visibleRange': VisibleRangeConfigNode
        },
        ['visibleRange'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum([
        'async-rejecting-hook',
        'first-call',
        'no-state-change',
        'retained-state-isolated',
        'scroll-moves-range',
        'throwing-hook'
      ] as const)
    },
    ['description', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
