import type {
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { TIMING_STATUS } from '../../../../src/timing/constants/index.js';
import { TimingScenarioCaseSchemaPart } from '../fixtures/TimingScenarioCaseSchemaPart.js';
import { TimingScenarioCaseNode } from './TimingScenarioCaseNode.js';

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
    'properties': {
      'component': { 'type': 'string' },
      'operation': { 'type': 'string' },
      'status': { 'enum': timingStatusValues }
    },
    'required': ['component', 'operation'],
    'type': 'object'
  } as const;

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

  /** Matches `Parameters<typeof TimingOptionsEntity.create>[0]` — an intake input, never `TimingOptionsEntity.Type`. */
  const timingOptionsInputSchema = {
    'additionalProperties': false,
    'properties': {
      'maximumEvents': { 'oneOf': [{ 'type': 'number' }, { 'type': 'null' }] },
      'precision': precisionInputSchema
    },
    'required': [],
    'type': 'object'
  } as const;

  const recordOfNumberSchema = {
    'additionalProperties': { 'type': 'number' },
    'properties': {},
    'type': 'object'
  } as const;
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'createdCount': { 'type': 'number' } },
            'required': ['createdCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'timing': {
                'additionalProperties': false,
                'properties': { 'options': { 'items': timingOptionsInputSchema, 'type': 'array' } },
                'required': ['options'],
                'type': 'object'
              }
            },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'unhandledRejections': { 'type': 'number' } },
            'required': ['unhandledRejections'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'errorMessage': { 'type': 'string' },
              'event': eventFixtureSchema,
              'settleTicks': { 'type': 'number' }
            },
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
            'properties': {
              'afterAddCount': { 'type': 'number' },
              'afterClearCount': { 'type': 'number' },
              'beforeCount': { 'type': 'number' }
            },
            'required': ['afterAddCount', 'afterClearCount', 'beforeCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'afterEvent': eventFixtureSchema,
              'batch': {
                'additionalProperties': false,
                'properties': { 'clearCount': { 'type': 'number' } },
                'required': ['clearCount'],
                'type': 'object'
              },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'durationIncreasesAfterClear': { 'type': 'boolean' } },
            'required': ['durationIncreasesAfterClear'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'waitAfterClearMs': { 'type': 'number' },
              'waitBeforeClearMs': { 'type': 'number' }
            },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'finalCount': { 'type': 'number' } },
            'required': ['finalCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'batch': {
                'additionalProperties': false,
                'properties': { 'clearCount': { 'type': 'number' } },
                'required': ['clearCount'],
                'type': 'object'
              },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'keys': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['keys'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } },
            'required': ['events'],
            'type': 'object'
          },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'wrapped': { 'type': 'boolean' } },
            'required': ['wrapped'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'errorMessage': { 'type': 'string' } },
            'required': ['errorMessage'],
            'type': 'object'
          },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'durationIncreases': { 'type': 'boolean' } },
            'required': ['durationIncreases'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'waitBeforeFirstMs': { 'type': 'number' },
              'waitBeforeSecondMs': { 'type': 'number' }
            },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'result': { 'type': 'number' } },
            'required': ['result'],
            'type': 'object'
          },
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
            'properties': {
              'expectMethods': { 'items': { 'enum': ['clear', 'event', 'getEvents'] }, 'type': 'array' }
            },
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
            'properties': {
              'keys': { 'items': { 'type': 'string' }, 'type': 'array' },
              'minimums': recordOfNumberSchema
            },
            'required': ['keys', 'minimums'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'events': { 'items': eventFixtureSchema, 'type': 'array' },
              'stageWaitMs': { 'items': { 'type': 'number' }, 'type': 'array' }
            },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'keys': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['keys'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } },
            'required': ['events'],
            'type': 'object'
          },
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
            'properties': {
              'defaultMaxEvents': { 'type': 'number' },
              'retainedLastEventPrefix': { 'type': 'string' },
              'retainedLastIndex': { 'type': 'number' }
            },
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
            'properties': {
              'evictedKeys': { 'items': { 'type': 'string' }, 'type': 'array' },
              'retainedKeys': { 'items': { 'type': 'string' }, 'type': 'array' }
            },
            'required': ['evictedKeys', 'retainedKeys'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'events': { 'items': eventFixtureSchema, 'type': 'array' },
              'timing': {
                'additionalProperties': false,
                'properties': { 'maximumEvents': { 'type': 'number' } },
                'required': ['maximumEvents'],
                'type': 'object'
              }
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'minElapsedMs': { 'type': 'number' } },
            'required': ['minElapsedMs'],
            'type': 'object'
          },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'instanceOf': { 'const': 'HookInvocationError' } },
            'required': ['instanceOf'],
            'type': 'object'
          },
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
          'input': {
            'additionalProperties': false,
            'properties': { 'event': eventFixtureSchema },
            'required': ['event'],
            'type': 'object'
          },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'minDurationMs': { 'type': 'number' } },
            'required': ['minDurationMs'],
            'type': 'object'
          },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'newKey': { 'type': 'string' } },
            'required': ['newKey'],
            'type': 'object'
          },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'keysInOrder': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['keysInOrder'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'busyWaitMs': { 'items': { 'type': 'number' }, 'type': 'array' },
              'events': { 'items': eventFixtureSchema, 'type': 'array' }
            },
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
            'properties': {
              'durationMsType': { 'const': 'number' },
              'eventKeys': { 'items': { 'type': 'string' }, 'type': 'array' }
            },
            'required': ['durationMsType', 'eventKeys'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'observeInitialize': { 'type': 'boolean' } },
            'required': ['observeInitialize'],
            'type': 'object'
          },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'serializable': { 'type': 'boolean' } },
            'required': ['serializable'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'event': eventFixtureSchema },
            'required': ['event'],
            'type': 'object'
          },
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
            'properties': {
              'allValuesAreNumbers': { 'type': 'boolean' },
              'keys': { 'items': { 'type': 'string' }, 'type': 'array' }
            },
            'required': ['allValuesAreNumbers', 'keys'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } },
            'required': ['events'],
            'type': 'object'
          },
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
            'properties': {
              'retainedSets': { 'items': { 'items': { 'type': 'string' }, 'type': 'array' }, 'type': 'array' }
            },
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
                    'timing': {
                      'additionalProperties': false,
                      'properties': { 'maximumEvents': { 'type': 'number' } },
                      'required': ['maximumEvents'],
                      'type': 'object'
                    }
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
            'properties': {
              'timing': {
                'additionalProperties': false,
                'properties': { 'maximumEvents': { 'type': 'number' } },
                'required': ['maximumEvents'],
                'type': 'object'
              }
            },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'maximumEvents': { 'type': 'number' } },
            'required': ['maximumEvents'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'defaultMaxEvents': { 'type': 'number' } },
            'required': ['defaultMaxEvents'],
            'type': 'object'
          },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'keys': { 'items': { 'type': 'string' }, 'type': 'array' } },
            'required': ['keys'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } },
            'required': ['events'],
            'type': 'object'
          },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'allElapsedNonNegative': { 'type': 'boolean' } },
            'required': ['allElapsedNonNegative'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } },
            'required': ['events'],
            'type': 'object'
          },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'clearCount': { 'type': 'number' } },
            'required': ['clearCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'batch': {
                'additionalProperties': false,
                'properties': { 'clearCount': { 'type': 'number' } },
                'required': ['clearCount'],
                'type': 'object'
              }
            },
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
          'input': {
            'additionalProperties': false,
            'properties': { 'event': eventFixtureSchema },
            'required': ['event'],
            'type': 'object'
          },
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
          'expected': {
            'additionalProperties': false,
            'properties': { 'evictCountAtLeast': { 'type': 'number' } },
            'required': ['evictCountAtLeast'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'events': { 'items': eventFixtureSchema, 'type': 'array' },
              'timing': {
                'additionalProperties': false,
                'properties': { 'maximumEvents': { 'type': 'number' } },
                'required': ['maximumEvents'],
                'type': 'object'
              }
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
            'properties': {
              'getEventsCount': { 'type': 'number' },
              'lastEventCounts': { 'items': { 'type': 'number' }, 'type': 'array' }
            },
            'required': ['getEventsCount', 'lastEventCounts'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'events': { 'items': eventFixtureSchema, 'type': 'array' } },
            'required': ['events'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'onGetEvents-hook-fires' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      ...TimingScenarioCaseSchemaPart.Schema
    ]
  } as const;

  export const Node = TimingScenarioCaseNode.Node;

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
}
