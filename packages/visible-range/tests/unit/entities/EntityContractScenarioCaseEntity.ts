import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The 5 scenario shapes `visible-range entity contracts` exercises. */
export namespace EntityContractScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'configData': {
                'additionalProperties': false,
                'properties': {
                  'invalid': {
                    'additionalProperties': false,
                    'properties': {
                      'count': { 'type': 'number' }
                    },
                    'required': ['count'],
                    'type': 'object'
                  },
                  'valid': {
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
                'required': ['invalid', 'valid'],
                'type': 'object'
              }
            },
            'required': ['configData'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'config-data-valid' }
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
          'shape': { 'const': 'constructor-both-sizes' }
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
          'shape': { 'const': 'constructor-invalid-item-size' }
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
          'shape': { 'const': 'constructor-missing-size' }
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
              'resolvedConfig': {
                'additionalProperties': false,
                'properties': {
                  'invalid': {
                    'additionalProperties': false,
                    'properties': {
                      'count': { 'type': 'number' },
                      'mode': { 'type': 'string' },
                      'overscan': { 'type': 'number' }
                    },
                    'required': ['count', 'mode', 'overscan'],
                    'type': 'object'
                  },
                  'valid': {
                    'additionalProperties': false,
                    'properties': {
                      'count': { 'type': 'number' },
                      'mode': { 'type': 'string' },
                      'overscan': { 'type': 'number' }
                    },
                    'required': ['count', 'mode', 'overscan'],
                    'type': 'object'
                  }
                },
                'required': ['invalid', 'valid'],
                'type': 'object'
              }
            },
            'required': ['resolvedConfig'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'resolved-config-valid' }
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
        'configData': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'invalid': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'count': SchemaNode.defineNumber({ 'type': 'number' } as const)
          }, ['count'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          'valid': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'overscan': SchemaNode.defineNumber({ 'type': 'number' } as const)
          }, ['count', 'itemSize', 'overscan'] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, ['invalid', 'valid'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['configData'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'config-data-valid' as const)
    }, ['description', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'estimateSizeValue': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'estimateSizeValue', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'constructor-both-sizes' as const)
    }, ['description', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'constructor-invalid-item-size' as const)
    }, ['description', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'constructor-missing-size' as const)
    }, ['description', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'resolvedConfig': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'invalid': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'mode': SchemaNode.defineString({ 'type': 'string' } as const),
            'overscan': SchemaNode.defineNumber({ 'type': 'number' } as const)
          }, ['count', 'mode', 'overscan'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          'valid': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'mode': SchemaNode.defineString({ 'type': 'string' } as const),
            'overscan': SchemaNode.defineNumber({ 'type': 'number' } as const)
          }, ['count', 'mode', 'overscan'] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, ['invalid', 'valid'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['resolvedConfig'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'resolved-config-valid' as const)
    }, ['description', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
