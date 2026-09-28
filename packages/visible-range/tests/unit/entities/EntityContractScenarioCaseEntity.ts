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

const ValidationInputSchema = {
  'additionalProperties': false,
  'properties': { 'invalid': {}, 'valid': {} },
  'required': ['invalid', 'valid'],
  'type': 'object'
} as const;
const ValidationInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'invalid': SchemaNode.defineUnknown({} as const), 'valid': SchemaNode.defineUnknown({} as const) }, ['invalid', 'valid'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The single scenario case shape `visible-range entity contracts` exercises. */
export namespace EntityContractScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'input': {
        'additionalProperties': false,
        'properties': {
          'configData': ValidationInputSchema,
          'resolvedConfig': ValidationInputSchema,
          'visibleRange': VisibleRangeConfigSchema
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'config-data-valid',
          'constructor-both-sizes',
          'constructor-invalid-item-size',
          'constructor-missing-size',
          'resolved-config-valid'
        ]
      }
    },
    'required': ['description', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'configData': ValidationInputNode,
          'resolvedConfig': ValidationInputNode,
          'visibleRange': VisibleRangeConfigNode
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, [
        'config-data-valid',
        'constructor-both-sizes',
        'constructor-invalid-item-size',
        'constructor-missing-size',
        'resolved-config-valid'
      ] as const)
    }, ['description', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
