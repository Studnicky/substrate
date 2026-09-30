import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The 15 scenario shapes `System.loop.spec.ts` exercises. */
export namespace SystemScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'nonEmpty': { 'type': 'boolean' }
            },
            'required': ['nonEmpty'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'cpu-arch-non-empty' }
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
              'callCount': { 'type': 'number' }
            },
            'required': ['callCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'cpu-getter-calls-os-cpus-once' }
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
              'source': { 'const': 'os.cpus().length' }
            },
            'required': ['source'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'cpu-logical-count-matches-os' }
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
              'minimum': { 'type': 'number' }
            },
            'required': ['minimum'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'cpu-logical-count-positive' }
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
              'nonEmpty': { 'type': 'boolean' }
            },
            'required': ['nonEmpty'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'cpu-model-non-empty' }
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
              'relation': { 'const': 'equal' }
            },
            'required': ['relation'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'cpu-physical-count-equals-logical-count' }
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
              'maximum': { 'const': 'logicalCount' },
              'minimum': { 'type': 'number' }
            },
            'required': ['maximum', 'minimum'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'cpu-physical-count-range' }
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
              'cached': { 'type': 'boolean' },
              'callCount': { 'type': 'number' }
            },
            'required': ['cached', 'callCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': {
                'additionalProperties': false,
                'properties': {
                  'detectedGpu': {
                    'additionalProperties': false,
                    'properties': {
                      'computeApi': { 'enum': ['cuda', 'metal', 'opencl', 'software'] },
                      'name': { 'type': 'string' },
                      'vramMb': {
                        'oneOf': [
                          { 'type': 'number' },
                          { 'type': 'null' }
                        ]
                      }
                    },
                    'required': ['computeApi', 'name', 'vramMb'],
                    'type': 'object'
                  }
                },
                'required': ['detectedGpu'],
                'type': 'object'
              }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'gpu-caches-detection' }
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
              'maximum': { 'const': 'totalMb' },
              'minimum': { 'type': 'number' }
            },
            'required': ['maximum', 'minimum'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'memory-free-range' }
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
              'minimum': { 'type': 'number' }
            },
            'required': ['minimum'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'memory-total-positive' }
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
              'minimum': { 'type': 'number' }
            },
            'required': ['minimum'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'optimal-worker-count-at-least-1' }
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
              'formula': { 'const': 'max(1, cpu.logicalCount - 1)' }
            },
            'required': ['formula'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'optimal-worker-count-clamped' }
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
              'formula': { 'const': 'darwin && arm64' }
            },
            'required': ['formula'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'platform-is-apple-silicon' }
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
              'source': { 'const': 'process.version' }
            },
            'required': ['source'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'platform-node-version' }
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
              'nonEmpty': { 'type': 'boolean' }
            },
            'required': ['nonEmpty'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'system': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
            },
            'required': ['system'],
            'type': 'object'
          },
          'name': { 'type': 'string' },
          'shape': { 'const': 'platform-os-non-empty' }
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
        'nonEmpty': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, ['nonEmpty'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'cpu-arch-non-empty' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'callCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, ['callCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'cpu-getter-calls-os-cpus-once' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'source': SchemaNode.defineConst({}, 'os.cpus().length' as const)
      }, ['source'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'cpu-logical-count-matches-os' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, ['minimum'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'cpu-logical-count-positive' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'nonEmpty': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, ['nonEmpty'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'cpu-model-non-empty' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'relation': SchemaNode.defineConst({}, 'equal' as const)
      }, ['relation'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'cpu-physical-count-equals-logical-count' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'maximum': SchemaNode.defineConst({}, 'logicalCount' as const),
        'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, ['maximum', 'minimum'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'cpu-physical-count-range' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'cached': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'callCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, ['cached', 'callCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'detectedGpu': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'computeApi': SchemaNode.defineEnum({}, ['cuda', 'metal', 'opencl', 'software'] as const),
            'name': SchemaNode.defineString({ 'type': 'string' } as const),
            'vramMb': SchemaNode.defineOneOf({}, [
              SchemaNode.defineNumber({ 'type': 'number' } as const),
              SchemaNode.defineNull({ 'type': 'null' } as const)
            ] as const)
          }, ['computeApi', 'name', 'vramMb'] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, ['detectedGpu'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'gpu-caches-detection' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'maximum': SchemaNode.defineConst({}, 'totalMb' as const),
        'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, ['maximum', 'minimum'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'memory-free-range' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, ['minimum'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'memory-total-positive' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, ['minimum'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'optimal-worker-count-at-least-1' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'formula': SchemaNode.defineConst({}, 'max(1, cpu.logicalCount - 1)' as const)
      }, ['formula'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'optimal-worker-count-clamped' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'formula': SchemaNode.defineConst({}, 'darwin && arm64' as const)
      }, ['formula'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'platform-is-apple-silicon' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'source': SchemaNode.defineConst({}, 'process.version' as const)
      }, ['source'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'platform-node-version' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'nonEmpty': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, ['nonEmpty'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'system': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['system'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'platform-os-non-empty' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
