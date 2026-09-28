import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { TIMING_STATUS } from '../../../src/constants/index.js';

/** The 14 distinct scenario shapes `validation.loop.spec.ts` exercises. */
export namespace ValidationScenarioCaseEntity {
  const timingStatusValues = [
    TIMING_STATUS.ABORT,
    TIMING_STATUS.ACQUIRED,
    TIMING_STATUS.COMPLETE,
    TIMING_STATUS.DEQUEUED,
    TIMING_STATUS.ERROR,
    TIMING_STATUS.HIT,
    TIMING_STATUS.MISS,
    TIMING_STATUS.QUEUED,
    TIMING_STATUS.RELEASED,
    TIMING_STATUS.START,
    TIMING_STATUS.TIMEOUT,
    TIMING_STATUS.WAITING
  ] as const;

  const timingStatusSchema = { 'enum': timingStatusValues } as const;

  const timingEventInputSchema = {
    'additionalProperties': false,
    'properties': { 'component': { 'type': 'string' }, 'operation': { 'type': 'string' }, 'status': timingStatusSchema },
    'required': ['component', 'operation'],
    'type': 'object'
  } as const;

  const timingEventInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'component': SchemaNode.defineString({ 'type': 'string' } as const),
      'operation': SchemaNode.defineString({ 'type': 'string' } as const),
      'status': SchemaNode.defineEnum({}, timingStatusValues)
    }, ['component', 'operation'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const recordOfNumberSchema = { 'additionalProperties': { 'type': 'number' }, 'properties': {}, 'type': 'object' } as const;
  const recordOfNumberNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineNumber({ 'type': 'number' } as const), 'patternProperties': {} });

  const recordOfUnknownSchema = { 'additionalProperties': {}, 'properties': {}, 'type': 'object' } as const;
  const recordOfUnknownNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineUnknown({} as const), 'patternProperties': {} });

  const emptyObjectSchema = { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' } as const;
  const emptyObjectNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'accepted': { 'const': true } }, 'required': ['accepted'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'values': { 'items': { 'type': 'number' }, 'type': 'array' } },
            'required': ['values'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'accepts-valid-max-events' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'errorNames': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['errorNames'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'values': { 'items': {}, 'type': 'array' } },
            'required': ['values'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'rejects-invalid-max-events' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'accepted': { 'const': true } }, 'required': ['accepted'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'values': { 'items': recordOfNumberSchema, 'type': 'array' } },
            'required': ['values'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'accepts-valid-precision' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'errorName': { 'const': 'ConfigurationError' } }, 'required': ['errorName'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'value': {} }, 'required': ['value'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'rejects-non-object-precision' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'errorName': { 'const': 'ConfigurationError' } }, 'required': ['errorName'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'value': {} }, 'required': ['value'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'rejects-array-precision' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'accepted': { 'const': true } }, 'required': ['accepted'], 'type': 'object' },
          'input': emptyObjectSchema,
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'accepts-empty-precision' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'accepted': { 'const': true } }, 'required': ['accepted'], 'type': 'object' },
          'input': emptyObjectSchema,
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'accepts-null-max-events' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'accepted': { 'const': true } }, 'required': ['accepted'], 'type': 'object' },
          'input': emptyObjectSchema,
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'accepts-undefined-max-events' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'errorNames': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['errorNames'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'values': { 'items': recordOfUnknownSchema, 'type': 'array' } },
            'required': ['values'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'rejects-invalid-precision' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'errorName': { 'const': 'ConfigurationError' } }, 'required': ['errorName'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'value': recordOfNumberSchema }, 'required': ['value'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'rejects-invalid-time-units' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'results': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
            'required': ['results'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'cases': {
                'items': {
                  'additionalProperties': false,
                  'properties': { 'entity': { 'type': 'string' }, 'value': {} },
                  'required': ['entity', 'value'],
                  'type': 'object'
                },
                'type': 'array'
              }
            },
            'required': ['cases'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'validates-entities' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'hasInitialize': { 'const': true }, 'maxDecimalPlaces': { 'type': 'number' } },
            'required': ['hasInitialize', 'maxDecimalPlaces'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'event': timingEventInputSchema,
              'timing': {
                'additionalProperties': false,
                'properties': {
                  'precision': { 'additionalProperties': false, 'properties': { 'ms': { 'type': 'number' } }, 'required': ['ms'], 'type': 'object' }
                },
                'required': ['precision'],
                'type': 'object'
              }
            },
            'required': ['event', 'timing'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'applies-precision' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'accepted': { 'const': true } }, 'required': ['accepted'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'timing': {
                'additionalProperties': false,
                'properties': {
                  'maximumEvents': { 'type': 'number' },
                  'precision': { 'additionalProperties': false, 'properties': { 'ms': { 'type': 'number' } }, 'required': ['ms'], 'type': 'object' }
                },
                'required': ['maximumEvents', 'precision'],
                'type': 'object'
              }
            },
            'required': ['timing'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'accepts-all-options' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'hasInitialize': { 'const': true } }, 'required': ['hasInitialize'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'hasInitialize': { 'type': 'boolean' } },
            'required': ['hasInitialize'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'applies-defaults' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'accepted': SchemaNode.defineConst({}, true as const) }, ['accepted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined) }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'accepts-valid-max-events' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['errorNames'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineUnknown({} as const), undefined) }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'rejects-invalid-max-events' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'accepted': SchemaNode.defineConst({}, true as const) }, ['accepted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': SchemaNode.defineArray({ 'type': 'array' } as const, recordOfNumberNode, undefined) }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'accepts-valid-precision' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineConst({}, 'ConfigurationError' as const) }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': SchemaNode.defineUnknown({} as const) }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'rejects-non-object-precision' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineConst({}, 'ConfigurationError' as const) }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': SchemaNode.defineUnknown({} as const) }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'rejects-array-precision' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'accepted': SchemaNode.defineConst({}, true as const) }, ['accepted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': emptyObjectNode,
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'accepts-empty-precision' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'accepted': SchemaNode.defineConst({}, true as const) }, ['accepted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': emptyObjectNode,
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'accepts-null-max-events' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'accepted': SchemaNode.defineConst({}, true as const) }, ['accepted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': emptyObjectNode,
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'accepts-undefined-max-events' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['errorNames'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'values': SchemaNode.defineArray({ 'type': 'array' } as const, recordOfUnknownNode, undefined) }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'rejects-invalid-precision' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineConst({}, 'ConfigurationError' as const) }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': recordOfNumberNode }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'rejects-invalid-time-units' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined) }, ['results'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'cases': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, { 'entity': SchemaNode.defineString({ 'type': 'string' } as const), 'value': SchemaNode.defineUnknown({} as const) }, ['entity', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined)
          }, ['cases'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'validates-entities' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'hasInitialize': SchemaNode.defineConst({}, true as const), 'maxDecimalPlaces': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['hasInitialize', 'maxDecimalPlaces'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'event': timingEventInputNode,
            'timing': SchemaNode.defineObject({ 'type': 'object' } as const, {
                'precision': SchemaNode.defineObject({ 'type': 'object' } as const, { 'ms': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['ms'] as const, { 'additionalProperties': false, 'patternProperties': {} })
              }, ['precision'] as const, { 'additionalProperties': false, 'patternProperties': {} })
          }, ['event', 'timing'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'applies-precision' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'accepted': SchemaNode.defineConst({}, true as const) }, ['accepted'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'timing': SchemaNode.defineObject({ 'type': 'object' } as const, {
                'maximumEvents': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'precision': SchemaNode.defineObject({ 'type': 'object' } as const, { 'ms': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['ms'] as const, { 'additionalProperties': false, 'patternProperties': {} })
              }, ['maximumEvents', 'precision'] as const, { 'additionalProperties': false, 'patternProperties': {} })
          }, ['timing'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'accepts-all-options' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'hasInitialize': SchemaNode.defineConst({}, true as const) }, ['hasInitialize'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'hasInitialize': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['hasInitialize'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'applies-defaults' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;
}
