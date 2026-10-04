import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The 8 scenario shapes `visible-range variable mode` exercises. */
export namespace VariableModeScenarioCaseEntity {
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
                  'estimateSizeValue': { 'type': 'number' }
                },
                'required': ['count', 'estimateSizeValue'],
                'type': 'object'
              }
            },
            'required': ['scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'initial-range' }
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
              'finalScrollOffset': { 'type': 'number' },
              'finalViewportSize': { 'type': 'number' },
              'measurements': { 'items': {
                'additionalProperties': false,
                'properties': {
                  'index': { 'type': 'number' },
                  'readAfter': { 'type': 'boolean' },
                  'size': { 'type': 'number' }
                },
                'required': ['index', 'readAfter', 'size'],
                'type': 'object'
              }, 'type': 'array' },
              'scrollOffset': { 'type': 'number' },
              'viewportSize': { 'type': 'number' },
              'visibleRange': {
                'additionalProperties': false,
                'properties': {
                  'count': { 'type': 'number' },
                  'estimateSizeValue': { 'type': 'number' }
                },
                'required': ['count', 'estimateSizeValue'],
                'type': 'object'
              }
            },
            'required': ['finalScrollOffset', 'finalViewportSize', 'measurements', 'scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'interleaved-measure-corrections' }
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
              'range': {
                'additionalProperties': false,
                'properties': {
                  'end': { 'type': 'number' },
                  'start': { 'type': 'number' }
                },
                'required': ['end', 'start'],
                'type': 'object'
              },
              'shape': { 'const': 'corrected-range' }
            },
            'required': ['range', 'shape'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'measurementBatch': {
                'additionalProperties': false,
                'properties': {
                  'endExclusive': { 'type': 'number' },
                  'size': { 'type': 'number' },
                  'start': { 'type': 'number' }
                },
                'required': ['endExclusive', 'size', 'start'],
                'type': 'object'
              },
              'scrollOffset': { 'type': 'number' },
              'viewportSize': { 'type': 'number' },
              'visibleRange': {
                'additionalProperties': false,
                'properties': {
                  'count': { 'type': 'number' },
                  'estimateSizeValue': { 'type': 'number' }
                },
                'required': ['count', 'estimateSizeValue'],
                'type': 'object'
              }
            },
            'required': ['measurementBatch', 'scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'measure-corrects-range' }
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
              'shape': { 'const': 'unchanged-range' }
            },
            'required': ['shape'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'measurements': { 'items': {
                'additionalProperties': false,
                'properties': {
                  'index': { 'type': 'number' },
                  'size': { 'type': 'number' }
                },
                'required': ['index', 'size'],
                'type': 'object'
              }, 'type': 'array' },
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
            'required': ['measurements', 'scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'measure-noop-fixed-mode' }
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
              'shape': { 'const': 'unchanged-range' }
            },
            'required': ['shape'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'measurements': { 'items': {
                'additionalProperties': false,
                'properties': {
                  'index': { 'type': 'number' },
                  'size': { 'type': 'number' }
                },
                'required': ['index', 'size'],
                'type': 'object'
              }, 'type': 'array' },
              'scrollOffset': { 'type': 'number' },
              'viewportSize': { 'type': 'number' },
              'visibleRange': {
                'additionalProperties': false,
                'properties': {
                  'count': { 'type': 'number' },
                  'estimateSizeValue': { 'type': 'number' }
                },
                'required': ['count', 'estimateSizeValue'],
                'type': 'object'
              }
            },
            'required': ['measurements', 'scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'measure-same-size-noop' }
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
                  'estimateSizeValue': { 'type': 'number' },
                  'overscan': { 'type': 'number' }
                },
                'required': ['count', 'estimateSizeValue', 'overscan'],
                'type': 'object'
              }
            },
            'required': ['scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'overscan-applied' }
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
                  'estimateSizeMode': { 'const': 'fractional-boundary' }
                },
                'required': ['count', 'estimateSizeMode'],
                'type': 'object'
              }
            },
            'required': ['scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'variable-boundary-offsets' }
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
                  'estimateSizeValue': { 'type': 'number' }
                },
                'required': ['count', 'estimateSizeValue'],
                'type': 'object'
              }
            },
            'required': ['scrollOffset', 'viewportSize', 'visibleRange'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'variable-count-zero' }
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
          'estimateSizeValue': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'estimateSizeValue'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'initial-range' as const)
    }, ['description', 'expect', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
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
        'finalScrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'finalViewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'measurements': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, {
          'index': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'readAfter': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'size': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['index', 'readAfter', 'size'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined),
        'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'estimateSizeValue': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'estimateSizeValue'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['finalScrollOffset', 'finalViewportSize', 'measurements', 'scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'interleaved-measure-corrections' as const)
    }, ['description', 'expect', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expect': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'range': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'end': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'start': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['end', 'start'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'shape': SchemaNode.defineConst({}, 'corrected-range' as const)
      }, ['range', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'measurementBatch': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'endExclusive': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'size': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'start': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['endExclusive', 'size', 'start'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'estimateSizeValue': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'estimateSizeValue'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['measurementBatch', 'scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'measure-corrects-range' as const)
    }, ['description', 'expect', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expect': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'shape': SchemaNode.defineConst({}, 'unchanged-range' as const)
      }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'measurements': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, {
          'index': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'size': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['index', 'size'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined),
        'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'itemSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'itemSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['measurements', 'scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'measure-noop-fixed-mode' as const)
    }, ['description', 'expect', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expect': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'shape': SchemaNode.defineConst({}, 'unchanged-range' as const)
      }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'measurements': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, {
          'index': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'size': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['index', 'size'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined),
        'scrollOffset': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'viewportSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'visibleRange': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'estimateSizeValue': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'estimateSizeValue'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['measurements', 'scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'measure-same-size-noop' as const)
    }, ['description', 'expect', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
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
          'estimateSizeValue': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'overscan': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'estimateSizeValue', 'overscan'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'overscan-applied' as const)
    }, ['description', 'expect', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
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
          'estimateSizeMode': SchemaNode.defineConst({}, 'fractional-boundary' as const)
        }, ['count', 'estimateSizeMode'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'variable-boundary-offsets' as const)
    }, ['description', 'expect', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
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
          'estimateSizeValue': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['count', 'estimateSizeValue'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['scrollOffset', 'viewportSize', 'visibleRange'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'variable-count-zero' as const)
    }, ['description', 'expect', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
