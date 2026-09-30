import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The 5 scenario shapes `config-validation.loop.spec.ts` exercises. */
export namespace ConfigValidationScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'errorName': { 'const': 'VisibleRangeError' }
            },
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
                'required': ['count', 'estimateSizeValue', 'itemSize'],
                'type': 'object'
              }
            },
            'required': ['visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'ambiguous-size' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'errorName': { 'const': 'VisibleRangeError' }
            },
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
                  'itemSize': { 'type': 'number' }
                },
                'required': ['count', 'itemSize'],
                'type': 'object'
              }
            },
            'required': ['visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'error-args' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'errorName': { 'const': 'VisibleRangeError' }
            },
            'required': ['errorName'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'visibleRange': {
                'additionalProperties': false,
                'properties': {
                  'count': { 'type': 'number' }
                },
                'required': ['count'],
                'type': 'object'
              }
            },
            'required': ['visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'missing-size' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'errorName': { 'const': 'VisibleRangeError' }
            },
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
                  'itemSize': { 'type': 'number' }
                },
                'required': ['count', 'itemSize'],
                'type': 'object'
              }
            },
            'required': ['visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'negative-size' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'errorName': { 'const': 'VisibleRangeError' }
            },
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
                  'itemSize': { 'type': 'number' }
                },
                'required': ['count', 'itemSize'],
                'type': 'object'
              }
            },
            'required': ['visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'zero-size' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'errorName': SchemaNode.defineConst({}, 'VisibleRangeError' as const)
      }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'estimateSizeValue': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'estimateSizeValue', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'ambiguous-size' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'errorName': SchemaNode.defineConst({}, 'VisibleRangeError' as const)
      }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'error-args' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'errorName': SchemaNode.defineConst({}, 'VisibleRangeError' as const)
      }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'missing-size' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'errorName': SchemaNode.defineConst({}, 'VisibleRangeError' as const)
      }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'negative-size' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'errorName': SchemaNode.defineConst({}, 'VisibleRangeError' as const)
      }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'zero-size' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
