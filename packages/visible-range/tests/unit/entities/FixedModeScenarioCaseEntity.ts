import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The 3 scenario shapes `visible-range fixed mode` exercises. */
export namespace FixedModeScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expect': {
            'additionalProperties': false,
            'properties': {
              'range': {
                'additionalProperties': false,
                'properties': {
                  'end': { 'type': 'number' },
                  'start': { 'type': 'number' }
                },
                'required': ['end', 'start'],
                'type': 'object'
              },
              'shape': { 'const': 'range' }
            },
            'required': ['range', 'shape'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scrollOffset': { 'type': 'number' },
              'viewportSize': { 'type': 'number' },
              'visibleRange': {
                'additionalProperties': false,
                'properties': {
                  'count': { 'type': 'number' },
                  'itemSize': { 'type': 'number' },
                  'overscan': { 'type': 'number' }
                },
                'required': ['count', 'itemSize'],
                'type': 'object'
              }
            },
            'required': ['scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'range' }
        },
        'required': ['description', 'expect', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expect': {
            'additionalProperties': false,
            'properties': {
              'shape': { 'const': 'range-end' },
              'value': { 'type': 'number' }
            },
            'required': ['shape', 'value'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scrollOffset': { 'type': 'number' },
              'viewportSize': { 'type': 'number' },
              'visibleRange': {
                'additionalProperties': false,
                'properties': {
                  'count': { 'type': 'number' },
                  'itemSize': { 'type': 'number' },
                  'overscan': { 'type': 'number' }
                },
                'required': ['count', 'itemSize', 'overscan'],
                'type': 'object'
              }
            },
            'required': ['scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'range-end' }
        },
        'required': ['description', 'expect', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expect': {
            'additionalProperties': false,
            'properties': {
              'shape': { 'const': 'range-start' },
              'value': { 'type': 'number' }
            },
            'required': ['shape', 'value'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scrollOffset': { 'type': 'number' },
              'viewportSize': { 'type': 'number' },
              'visibleRange': {
                'additionalProperties': false,
                'properties': {
                  'count': { 'type': 'number' },
                  'itemSize': { 'type': 'number' },
                  'overscan': { 'type': 'number' }
                },
                'required': ['count', 'itemSize', 'overscan'],
                'type': 'object'
              }
            },
            'required': ['scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'range-start' }
        },
        'required': ['description', 'expect', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expect': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'range': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'end': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'start': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['end', 'start'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'shape': SchemaNode.defineConst({}, 'range' as const)
      }, ['range', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'overscan': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'range' as const)
    }, ['description', 'expect', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expect': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'shape': SchemaNode.defineConst({}, 'range-end' as const),
        'value': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, ['shape', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'overscan': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize', 'overscan'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'range-end' as const)
    }, ['description', 'expect', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expect': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'shape': SchemaNode.defineConst({}, 'range-start' as const),
        'value': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, ['shape', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'overscan': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize', 'overscan'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'range-start' as const)
    }, ['description', 'expect', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
