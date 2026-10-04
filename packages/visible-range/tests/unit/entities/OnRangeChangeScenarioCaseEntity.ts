import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The 6 scenario shapes `visible-range onRangeChange` exercises. */
export namespace OnRangeChangeScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scrollOffset': { 'type': 'number' },
              'viewportSize': { 'type': 'number' },
              'visibleRange': {
                'additionalProperties': false,
                'properties': {
                  'count': { 'type': 'number' },
                  'itemSize': { 'type': 'number' }
                },
                'required': ['count', 'itemSize'],
                'type': 'object'
              }
            },
            'required': ['scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'async-rejecting-hook' }
        },
        'required': ['description', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scrollOffset': { 'type': 'number' },
              'viewportSize': { 'type': 'number' },
              'visibleRange': {
                'additionalProperties': false,
                'properties': {
                  'count': { 'type': 'number' },
                  'itemSize': { 'type': 'number' }
                },
                'required': ['count', 'itemSize'],
                'type': 'object'
              }
            },
            'required': ['scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'first-call' }
        },
        'required': ['description', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scrollOffset': { 'type': 'number' },
              'viewportSize': { 'type': 'number' },
              'visibleRange': {
                'additionalProperties': false,
                'properties': {
                  'count': { 'type': 'number' },
                  'itemSize': { 'type': 'number' }
                },
                'required': ['count', 'itemSize'],
                'type': 'object'
              }
            },
            'required': ['scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'no-state-change' }
        },
        'required': ['description', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scrollOffset': { 'type': 'number' },
              'viewportSize': { 'type': 'number' },
              'visibleRange': {
                'additionalProperties': false,
                'properties': {
                  'count': { 'type': 'number' },
                  'itemSize': { 'type': 'number' }
                },
                'required': ['count', 'itemSize'],
                'type': 'object'
              }
            },
            'required': ['scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'retained-state-isolated' }
        },
        'required': ['description', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'nextScrollOffset': { 'type': 'number' },
              'scrollOffset': { 'type': 'number' },
              'viewportSize': { 'type': 'number' },
              'visibleRange': {
                'additionalProperties': false,
                'properties': {
                  'count': { 'type': 'number' },
                  'itemSize': { 'type': 'number' }
                },
                'required': ['count', 'itemSize'],
                'type': 'object'
              }
            },
            'required': ['nextScrollOffset', 'scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'scroll-moves-range' }
        },
        'required': ['description', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scrollOffset': { 'type': 'number' },
              'viewportSize': { 'type': 'number' },
              'visibleRange': {
                'additionalProperties': false,
                'properties': {
                  'count': { 'type': 'number' },
                  'itemSize': { 'type': 'number' }
                },
                'required': ['count', 'itemSize'],
                'type': 'object'
              }
            },
            'required': ['scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'throwing-hook' }
        },
        'required': ['description', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'async-rejecting-hook' as const)
    }, ['description', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'first-call' as const)
    }, ['description', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'no-state-change' as const)
    }, ['description', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'retained-state-isolated' as const)
    }, ['description', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'nextScrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['nextScrollOffset', 'scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'scroll-moves-range' as const)
    }, ['description', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'throwing-hook' as const)
    }, ['description', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
