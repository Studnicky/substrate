import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { TIMING_STATUS } from '../../../src/constants/index.js';

/** The 44 distinct scenario shapes `Timing.loop.spec.ts` exercises. */
export namespace TimingScenarioCaseEntity {
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

  const eventFixtureSchema = {
    'additionalProperties': false,
    'properties': { 'component': { 'type': 'string' }, 'operation': { 'type': 'string' }, 'status': { 'enum': timingStatusValues } },
    'required': ['component', 'operation'],
    'type': 'object'
  } as const;

  const eventFixtureNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'component': SchemaNode.defineString({ 'type': 'string' } as const),
      'operation': SchemaNode.defineString({ 'type': 'string' } as const),
      'status': SchemaNode.defineEnum({}, timingStatusValues)
    }, ['component', 'operation'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const precisionInputSchema = {
    'additionalProperties': false,
    'properties': {
      'h': { 'type': 'number' },
      'm': { 'type': 'number' },
      'ms': { 'type': 'number' },
      'ns': { 'type': 'number' },
      's': { 'type': 'number' }
    },
    'required': [],
    'type': 'object'
  } as const;

  const precisionInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'h': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'm': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'ms': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'ns': SchemaNode.defineNumber({ 'type': 'number' } as const),
      's': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

  /** Matches `Parameters<typeof TimingOptionsEntity.create>[0]` — an intake input, never `TimingOptionsEntity.Type`. */
  const timingOptionsInputSchema = {
    'additionalProperties': false,
    'properties': { 'maximumEvents': { 'oneOf': [{ 'type': 'number' }, { 'type': 'null' }] }, 'precision': precisionInputSchema },
    'required': [],
    'type': 'object'
  } as const;

  const timingOptionsInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'maximumEvents': SchemaNode.defineOneOf({}, [SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)]),
      'precision': precisionInputNode
    }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const recordOfNumberSchema = { 'additionalProperties': { 'type': 'number' }, 'properties': {}, 'type': 'object' } as const;
  const recordOfNumberNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineNumber({ 'type': 'number' } as const), 'patternProperties': {} });

  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'createdCount': { 'type': 'number' } }, 'required': ['createdCount'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'timing': { 'additionalProperties': false, 'properties': { 'options': { 'items': timingOptionsInputSchema, 'type': 'array' } }, 'required': ['options'], 'type': 'object' } },
            'required': ['timing'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'accepts-config-options' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'unhandledRejections': { 'type': 'number' } }, 'required': ['unhandledRejections'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'errorMessage': { 'type': 'string' }, 'event': eventFixtureSchema, 'settleTicks': { 'type': 'number' } },
            'required': ['errorMessage', 'event', 'settleTicks'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'async-onEvent-unhandled' }
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
            'properties': { 'afterAddCount': { 'type': 'number' }, 'afterClearCount': { 'type': 'number' }, 'beforeCount': { 'type': 'number' } },
            'required': ['afterAddCount', 'afterClearCount', 'beforeCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'afterEvent': eventFixtureSchema,
              'batch': { 'additionalProperties': false, 'properties': { 'clearCount': { 'type': 'number' } }, 'required': ['clearCount'], 'type': 'object' },
              'beforeEvents': { 'items': eventFixtureSchema, 'type': 'array' },
              'waitAfterClearMs': { 'type': 'number' }
            },
            'required': ['afterEvent', 'batch', 'beforeEvents', 'waitAfterClearMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'clear-all-and-reuse' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'durationIncreasesAfterClear': { 'type': 'boolean' } }, 'required': ['durationIncreasesAfterClear'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'waitAfterClearMs': { 'type': 'number' }, 'waitBeforeClearMs': { 'type': 'number' } },
            'required': ['waitAfterClearMs', 'waitBeforeClearMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'clear-keeps-start-time' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'finalCount': { 'type': 'number' } }, 'required': ['finalCount'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'batch': { 'additionalProperties': false, 'properties': { 'clearCount': { 'type': 'number' } }, 'required': ['clearCount'], 'type': 'object' },
              'event': eventFixtureSchema
            },
            'required': ['batch', 'event'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'clear-multiple-times' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'keys': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['keys'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } }, 'required': ['events'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'component-operation-events' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'wrapped': { 'type': 'boolean' } }, 'required': ['wrapped'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'errorMessage': { 'type': 'string' } }, 'required': ['errorMessage'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'constructor-wraps-error' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'durationIncreases': { 'type': 'boolean' } }, 'required': ['durationIncreases'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'waitBeforeFirstMs': { 'type': 'number' }, 'waitBeforeSecondMs': { 'type': 'number' } },
            'required': ['waitBeforeFirstMs', 'waitBeforeSecondMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'continues-after-get-events' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'result': { 'type': 'number' } }, 'required': ['result'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'ns': { 'type': 'number' }, 'unit': { 'const': 'ms' } },
            'required': ['ns', 'unit'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'convert-time' }
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
            'properties': { 'instanceOf': { 'const': 'Timing' }, 'methodCount': { 'type': 'number' } },
            'required': ['instanceOf', 'methodCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'expectMethods': { 'items': { 'enum': ['clear', 'event', 'getEvents'] }, 'type': 'array' } },
            'required': ['expectMethods'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'creates-instance' }
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
            'properties': { 'keys': { 'items': { 'type': 'string' }, 'type': 'array' }, 'minimums': recordOfNumberSchema },
            'required': ['keys', 'minimums'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' }, 'stageWaitMs': { 'items': { 'type': 'number' }, 'type': 'array' } },
            'required': ['events', 'stageWaitMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'cumulative-timing' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'keys': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['keys'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } }, 'required': ['events'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'domain-status' }
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
            'properties': { 'defaultMaxEvents': { 'type': 'number' }, 'retainedLastEventPrefix': { 'type': 'string' }, 'retainedLastIndex': { 'type': 'number' } },
            'required': ['defaultMaxEvents', 'retainedLastEventPrefix', 'retainedLastIndex'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'event': {
                'additionalProperties': false,
                'properties': { 'component': { 'type': 'string' }, 'operationPrefix': { 'type': 'string' } },
                'required': ['component', 'operationPrefix'],
                'type': 'object'
              },
              'overflowMargin': { 'type': 'number' }
            },
            'required': ['event', 'overflowMargin'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'evicts-default-max-events' }
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
            'properties': { 'evictedKeys': { 'items': { 'type': 'string' }, 'type': 'array' }, 'retainedKeys': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['evictedKeys', 'retainedKeys'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'events': { 'items': eventFixtureSchema, 'type': 'array' },
              'timing': { 'additionalProperties': false, 'properties': { 'maximumEvents': { 'type': 'number' } }, 'required': ['maximumEvents'], 'type': 'object' }
            },
            'required': ['events', 'timing'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'evicts-when-max-events-exceeded' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'minElapsedMs': { 'type': 'number' } }, 'required': ['minElapsedMs'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'busyWaitMs': { 'type': 'number' }, 'event': eventFixtureSchema },
            'required': ['busyWaitMs', 'event'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'high-resolution-timing' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'instanceOf': { 'const': 'HookInvocationError' } }, 'required': ['instanceOf'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'errorMessage': { 'type': 'string' }, 'event': eventFixtureSchema },
            'required': ['errorMessage', 'event'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'hook-error-instance' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'event': eventFixtureSchema }, 'required': ['event'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'immediate-operations' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'minDurationMs': { 'type': 'number' } }, 'required': ['minDurationMs'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'busyWaitMs': { 'type': 'number' }, 'event': eventFixtureSchema },
            'required': ['busyWaitMs', 'event'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'includes-duration' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'newKey': { 'type': 'string' } }, 'required': ['newKey'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'firstEvent': eventFixtureSchema, 'secondEvent': eventFixtureSchema },
            'required': ['firstEvent', 'secondEvent'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'includes-later-events' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'keysInOrder': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['keysInOrder'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'busyWaitMs': { 'items': { 'type': 'number' }, 'type': 'array' }, 'events': { 'items': eventFixtureSchema, 'type': 'array' } },
            'required': ['busyWaitMs', 'events'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'increasing-elapsed-times' }
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
            'properties': { 'durationMsType': { 'const': 'number' }, 'eventKeys': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['durationMsType', 'eventKeys'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'observeInitialize': { 'type': 'boolean' } }, 'required': ['observeInitialize'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'initial-only-initialize' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'serializable': { 'type': 'boolean' } }, 'required': ['serializable'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'event': eventFixtureSchema }, 'required': ['event'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'json-serializable' }
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
            'properties': { 'allValuesAreNumbers': { 'type': 'boolean' }, 'keys': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['allValuesAreNumbers', 'keys'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } }, 'required': ['events'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'logbody-context' }
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
            'properties': { 'retainedSets': { 'items': { 'items': { 'type': 'string' }, 'type': 'array' }, 'type': 'array' } },
            'required': ['retainedSets'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'cases': {
                'items': {
                  'additionalProperties': false,
                  'properties': {
                    'eventNames': { 'items': { 'type': 'string' }, 'type': 'array' },
                    'timing': { 'additionalProperties': false, 'properties': { 'maximumEvents': { 'type': 'number' } }, 'required': ['maximumEvents'], 'type': 'object' }
                  },
                  'required': ['eventNames', 'timing'],
                  'type': 'object'
                },
                'type': 'array'
              }
            },
            'required': ['cases'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'maintains-most-recent-events' }
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
            'properties': { 'maximumEvents': { 'type': 'number' }, 'startTimeType': { 'const': 'bigint' } },
            'required': ['maximumEvents', 'startTimeType'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'timing': { 'additionalProperties': false, 'properties': { 'maximumEvents': { 'type': 'number' } }, 'required': ['maximumEvents'], 'type': 'object' } },
            'required': ['timing'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'maximumEvents-accessible' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'maximumEvents': { 'type': 'number' } }, 'required': ['maximumEvents'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'defaultMaxEvents': { 'type': 'number' } }, 'required': ['defaultMaxEvents'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'maximumEvents-defaults' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'keys': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['keys'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } }, 'required': ['events'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'mixes-status-and-plain' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'allElapsedNonNegative': { 'type': 'boolean' } }, 'required': ['allElapsedNonNegative'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } }, 'required': ['events'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'non-negative-values' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'clearCount': { 'type': 'number' } }, 'required': ['clearCount'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'batch': { 'additionalProperties': false, 'properties': { 'clearCount': { 'type': 'number' } }, 'required': ['clearCount'], 'type': 'object' } },
            'required': ['batch'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'onClear-hook-called' }
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
            'properties': { 'eventCountDelta': { 'type': 'number' }, 'lastEventData': { 'type': 'string' } },
            'required': ['eventCountDelta', 'lastEventData'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'event': eventFixtureSchema }, 'required': ['event'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'onEvent-hook-called' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'evictCountAtLeast': { 'type': 'number' } }, 'required': ['evictCountAtLeast'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'events': { 'items': eventFixtureSchema, 'type': 'array' },
              'timing': { 'additionalProperties': false, 'properties': { 'maximumEvents': { 'type': 'number' } }, 'required': ['maximumEvents'], 'type': 'object' }
            },
            'required': ['events', 'timing'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'onEvict-hook-called' }
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
            'properties': { 'getEventsCount': { 'type': 'number' }, 'lastEventCounts': { 'items': { 'type': 'number' }, 'type': 'array' } },
            'required': ['getEventsCount', 'lastEventCounts'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } }, 'required': ['events'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'onGetEvents-hook-fires' }
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
            'properties': { 'initCount': { 'type': 'number' }, 'startTimeType': { 'const': 'bigint' } },
            'required': ['initCount', 'startTimeType'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'construct': { 'type': 'boolean' } }, 'required': ['construct'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'onInitialize-hook-fires' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'keys': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['keys'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } }, 'required': ['events'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'optional-status' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'readCountDelta': { 'type': 'number' } }, 'required': ['readCountDelta'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'event': eventFixtureSchema }, 'required': ['event'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'read-hrtime-called' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'sameReference': { 'type': 'boolean' } }, 'required': ['sameReference'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'event': eventFixtureSchema }, 'required': ['event'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'returns-new-object' }
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
            'properties': { 'keys': { 'items': { 'type': 'string' }, 'type': 'array' }, 'uniqueCount': { 'type': 'number' } },
            'required': ['keys', 'uniqueCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'busyWaitMs': { 'type': 'number' }, 'event': eventFixtureSchema },
            'required': ['busyWaitMs', 'event'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'same-name-events' }
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
            'properties': { 'hasInitialize': { 'type': 'boolean' }, 'minDurationMs': { 'type': 'number' } },
            'required': ['hasInitialize', 'minDurationMs'],
            'type': 'object'
          },
          'input': { 'additionalProperties': false, 'properties': { 'busyWaitMs': { 'type': 'number' } }, 'required': ['busyWaitMs'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'starts-immediately' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'errorName': { 'const': 'HookInvocationError' } }, 'required': ['errorName'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'errorMessage': { 'type': 'string' }, 'event': eventFixtureSchema },
            'required': ['errorMessage', 'event'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'throwing-onClear' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'errorName': { 'const': 'HookInvocationError' } }, 'required': ['errorName'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': { 'errorMessage': { 'type': 'string' }, 'event': eventFixtureSchema },
            'required': ['errorMessage', 'event'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'throwing-onEvent' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'errorName': { 'const': 'HookInvocationError' } }, 'required': ['errorName'], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'errorMessage': { 'type': 'string' },
              'event': eventFixtureSchema,
              'timing': { 'additionalProperties': false, 'properties': { 'maximumEvents': { 'type': 'number' } }, 'required': ['maximumEvents'], 'type': 'object' }
            },
            'required': ['errorMessage', 'event', 'timing'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'throwing-onEvict' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'errorName': { 'const': 'HookInvocationError' } }, 'required': ['errorName'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'errorMessage': { 'type': 'string' } }, 'required': ['errorMessage'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'throwing-onGetEvents' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'errorName': { 'const': 'HookInvocationError' } }, 'required': ['errorName'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'errorMessage': { 'type': 'string' } }, 'required': ['errorMessage'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'throwing-onInitialize' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'keys': { 'items': { 'type': 'string' }, 'type': 'array' } }, 'required': ['keys'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } }, 'required': ['events'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'timing-status-constants' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'createdCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['createdCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'timing': SchemaNode.defineObject({ 'type': 'object' } as const, { 'options': SchemaNode.defineArray({ 'type': 'array' } as const, timingOptionsInputNode, undefined) }, ['options'] as const, { 'additionalProperties': false, 'patternProperties': {} })
          }, ['timing'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'accepts-config-options' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['unhandledRejections'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const), 'event': eventFixtureNode, 'settleTicks': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['errorMessage', 'event', 'settleTicks'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'async-onEvent-unhandled' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'afterAddCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'afterClearCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'beforeCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
          }, ['afterAddCount', 'afterClearCount', 'beforeCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'afterEvent': eventFixtureNode,
            'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'clearCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['clearCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
            'beforeEvents': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined),
            'waitAfterClearMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          }, ['afterEvent', 'batch', 'beforeEvents', 'waitAfterClearMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'clear-all-and-reuse' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'durationIncreasesAfterClear': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['durationIncreasesAfterClear'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'waitAfterClearMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'waitBeforeClearMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['waitAfterClearMs', 'waitBeforeClearMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'clear-keeps-start-time' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'finalCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['finalCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'clearCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['clearCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
            'event': eventFixtureNode
          }, ['batch', 'event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'clear-multiple-times' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'keys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['keys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined) }, ['events'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'component-operation-events' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'wrapped': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['wrapped'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const) }, ['errorMessage'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'constructor-wraps-error' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'durationIncreases': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['durationIncreases'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'waitBeforeFirstMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'waitBeforeSecondMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['waitBeforeFirstMs', 'waitBeforeSecondMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'continues-after-get-events' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'ns': SchemaNode.defineNumber({ 'type': 'number' } as const), 'unit': SchemaNode.defineConst({}, 'ms' as const) }, ['ns', 'unit'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'convert-time' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'instanceOf': SchemaNode.defineConst({}, 'Timing' as const), 'methodCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['instanceOf', 'methodCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'expectMethods': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineEnum({}, ['clear', 'event', 'getEvents'] as const), undefined) }, ['expectMethods'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'creates-instance' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'keys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined), 'minimums': recordOfNumberNode }, ['keys', 'minimums'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined),
            'stageWaitMs': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)
          }, ['events', 'stageWaitMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'cumulative-timing' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'keys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['keys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined) }, ['events'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'domain-status' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'defaultMaxEvents': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'retainedLastEventPrefix': SchemaNode.defineString({ 'type': 'string' } as const),
            'retainedLastIndex': SchemaNode.defineNumber({ 'type': 'number' } as const)
          }, ['defaultMaxEvents', 'retainedLastEventPrefix', 'retainedLastIndex'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'event': SchemaNode.defineObject({ 'type': 'object' } as const, { 'component': SchemaNode.defineString({ 'type': 'string' } as const), 'operationPrefix': SchemaNode.defineString({ 'type': 'string' } as const) }, ['component', 'operationPrefix'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
            'overflowMargin': SchemaNode.defineNumber({ 'type': 'number' } as const)
          }, ['event', 'overflowMargin'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'evicts-default-max-events' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'evictedKeys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
            'retainedKeys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
          }, ['evictedKeys', 'retainedKeys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined),
            'timing': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumEvents': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['maximumEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} })
          }, ['events', 'timing'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'evicts-when-max-events-exceeded' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'minElapsedMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['minElapsedMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'busyWaitMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'event': eventFixtureNode }, ['busyWaitMs', 'event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'high-resolution-timing' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'instanceOf': SchemaNode.defineConst({}, 'HookInvocationError' as const) }, ['instanceOf'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const), 'event': eventFixtureNode }, ['errorMessage', 'event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'hook-error-instance' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'event': eventFixtureNode }, ['event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'immediate-operations' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'minDurationMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['minDurationMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'busyWaitMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'event': eventFixtureNode }, ['busyWaitMs', 'event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'includes-duration' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'newKey': SchemaNode.defineString({ 'type': 'string' } as const) }, ['newKey'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'firstEvent': eventFixtureNode, 'secondEvent': eventFixtureNode }, ['firstEvent', 'secondEvent'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'includes-later-events' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'keysInOrder': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['keysInOrder'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'busyWaitMs': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
            'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined)
          }, ['busyWaitMs', 'events'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'increasing-elapsed-times' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'durationMsType': SchemaNode.defineConst({}, 'number' as const), 'eventKeys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['durationMsType', 'eventKeys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'observeInitialize': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['observeInitialize'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'initial-only-initialize' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'serializable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['serializable'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'event': eventFixtureNode }, ['event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'json-serializable' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'allValuesAreNumbers': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'keys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['allValuesAreNumbers', 'keys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined) }, ['events'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'logbody-context' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'retainedSets': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined), undefined) }, ['retainedSets'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'cases': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, {
                  'eventNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
                  'timing': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumEvents': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['maximumEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} })
                }, ['eventNames', 'timing'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined)
          }, ['cases'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'maintains-most-recent-events' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumEvents': SchemaNode.defineNumber({ 'type': 'number' } as const), 'startTimeType': SchemaNode.defineConst({}, 'bigint' as const) }, ['maximumEvents', 'startTimeType'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timing': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumEvents': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['maximumEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['timing'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'maximumEvents-accessible' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumEvents': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['maximumEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'defaultMaxEvents': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['defaultMaxEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'maximumEvents-defaults' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'keys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['keys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined) }, ['events'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'mixes-status-and-plain' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'allElapsedNonNegative': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['allElapsedNonNegative'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined) }, ['events'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'non-negative-values' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'clearCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['clearCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'clearCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['clearCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }) }, ['batch'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'onClear-hook-called' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'eventCountDelta': SchemaNode.defineNumber({ 'type': 'number' } as const), 'lastEventData': SchemaNode.defineString({ 'type': 'string' } as const) }, ['eventCountDelta', 'lastEventData'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'event': eventFixtureNode }, ['event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'onEvent-hook-called' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'evictCountAtLeast': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['evictCountAtLeast'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined),
            'timing': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumEvents': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['maximumEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} })
          }, ['events', 'timing'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'onEvict-hook-called' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'getEventsCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'lastEventCounts': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined) }, ['getEventsCount', 'lastEventCounts'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined) }, ['events'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'onGetEvents-hook-fires' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'initCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'startTimeType': SchemaNode.defineConst({}, 'bigint' as const) }, ['initCount', 'startTimeType'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'construct': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['construct'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'onInitialize-hook-fires' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'keys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['keys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined) }, ['events'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'optional-status' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'readCountDelta': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['readCountDelta'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'event': eventFixtureNode }, ['event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'read-hrtime-called' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'sameReference': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['sameReference'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'event': eventFixtureNode }, ['event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'returns-new-object' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'keys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined), 'uniqueCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['keys', 'uniqueCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'busyWaitMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'event': eventFixtureNode }, ['busyWaitMs', 'event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'same-name-events' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'hasInitialize': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'minDurationMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['hasInitialize', 'minDurationMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'busyWaitMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['busyWaitMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'starts-immediately' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineConst({}, 'HookInvocationError' as const) }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const), 'event': eventFixtureNode }, ['errorMessage', 'event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'throwing-onClear' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineConst({}, 'HookInvocationError' as const) }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const), 'event': eventFixtureNode }, ['errorMessage', 'event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'throwing-onEvent' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineConst({}, 'HookInvocationError' as const) }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'event': eventFixtureNode,
            'timing': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumEvents': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['maximumEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} })
          }, ['errorMessage', 'event', 'timing'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'throwing-onEvict' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineConst({}, 'HookInvocationError' as const) }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const) }, ['errorMessage'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'throwing-onGetEvents' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': SchemaNode.defineConst({}, 'HookInvocationError' as const) }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const) }, ['errorMessage'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'throwing-onInitialize' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    SchemaNode.defineObject({ 'type': 'object' } as const, {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'keys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['keys'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'events': SchemaNode.defineArray({ 'type': 'array' } as const, eventFixtureNode, undefined) }, ['events'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, 'timing-status-constants' as const)
      }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  ] as const);

  export type Type = NodeStaticType<typeof Node>;
}
