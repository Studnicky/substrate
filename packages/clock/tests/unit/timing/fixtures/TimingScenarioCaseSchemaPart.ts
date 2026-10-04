import { TIMING_STATUS } from '../../../../src/timing/constants/index.js';

export namespace TimingScenarioCaseSchemaPart {
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

  export const Schema = [
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
        'input': {
          'additionalProperties': false,
          'properties': { 'construct': { 'type': 'boolean' } },
          'required': ['construct'],
          'type': 'object'
        },
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
        'shape': { 'const': 'optional-status' }
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
          'properties': { 'readCountDelta': { 'type': 'number' } },
          'required': ['readCountDelta'],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': { 'event': eventFixtureSchema },
          'required': ['event'],
          'type': 'object'
        },
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
        'expected': {
          'additionalProperties': false,
          'properties': { 'sameReference': { 'type': 'boolean' } },
          'required': ['sameReference'],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': { 'event': eventFixtureSchema },
          'required': ['event'],
          'type': 'object'
        },
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
          'properties': {
            'keys': { 'items': { 'type': 'string' }, 'type': 'array' },
            'uniqueCount': { 'type': 'number' }
          },
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
        'input': {
          'additionalProperties': false,
          'properties': { 'busyWaitMs': { 'type': 'number' } },
          'required': ['busyWaitMs'],
          'type': 'object'
        },
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
        'expected': {
          'additionalProperties': false,
          'properties': { 'errorName': { 'const': 'HookInvocationError' } },
          'required': ['errorName'],
          'type': 'object'
        },
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
        'expected': {
          'additionalProperties': false,
          'properties': { 'errorName': { 'const': 'HookInvocationError' } },
          'required': ['errorName'],
          'type': 'object'
        },
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
        'expected': {
          'additionalProperties': false,
          'properties': { 'errorName': { 'const': 'HookInvocationError' } },
          'required': ['errorName'],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'errorMessage': { 'type': 'string' },
            'event': eventFixtureSchema,
            'timing': {
              'additionalProperties': false,
              'properties': { 'maximumEvents': { 'type': 'number' } },
              'required': ['maximumEvents'],
              'type': 'object'
            }
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
        'expected': {
          'additionalProperties': false,
          'properties': { 'errorName': { 'const': 'HookInvocationError' } },
          'required': ['errorName'],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': { 'errorMessage': { 'type': 'string' } },
          'required': ['errorMessage'],
          'type': 'object'
        },
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
        'expected': {
          'additionalProperties': false,
          'properties': { 'errorName': { 'const': 'HookInvocationError' } },
          'required': ['errorName'],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': { 'errorMessage': { 'type': 'string' } },
          'required': ['errorMessage'],
          'type': 'object'
        },
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
        'shape': { 'const': 'timing-status-constants' }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    }
  ] as const;

}
