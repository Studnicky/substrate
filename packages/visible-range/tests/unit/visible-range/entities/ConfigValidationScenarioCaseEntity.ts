import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `config-validation.loop.spec.ts` exercises. */
export namespace ConfigValidationScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'errorName': { 'const': 'VisibleRangeError' } },
        'required': ['errorName'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'visibleRange': {
            'additionalProperties': false,
            'properties': {
              'count': { 'type': 'number' },
              'estimateSizeValue': { 'type': 'number' },
              'itemSize': { 'type': 'number' }
            },
            'required': ['count'],
            'type': 'object'
          }
        },
        'required': ['visibleRange'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': ['ambiguous-size', 'error-args', 'missing-size', 'negative-size', 'zero-size'] }
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
        { 'errorName': SchemaNode.defineConst('VisibleRangeError' as const) },
        ['errorName'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'visibleRange': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            {
              'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
              'estimateSizeValue': SchemaNode.defineNumber({ 'type': 'number' } as const),
              'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
            },
            ['count'] as const,
            { 'additionalProperties': false }
          )
        },
        ['visibleRange'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(['ambiguous-size', 'error-args', 'missing-size', 'negative-size', 'zero-size'] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
