import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The 11 scenario shapes `Delay.loop.spec.ts` exercises. */
export namespace DelayScenarioCaseEntity {
  const schedulerInputSchema = {
    'additionalProperties': false,
    'properties': {
      'counter': {
        'additionalProperties': false,
        'properties': { 'startMs': { 'type': 'number' } },
        'required': ['startMs'],
        'type': 'object'
      }
    },
    'required': ['counter'],
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
            'properties': { 'elapsedMsAtLeast': { 'type': 'number' } },
            'required': ['elapsedMsAtLeast'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'sleepMs': { 'type': 'number' } },
            'required': ['sleepMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'real-time-sleep' }
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
            'properties': { 'resolved': { 'type': 'boolean' }, 'virtualSleepMs': { 'type': 'number' } },
            'required': ['resolved', 'virtualSleepMs'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'scheduler': schedulerInputSchema, 'sleepMs': { 'type': 'number' } },
            'required': ['scheduler', 'sleepMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-sleep' }
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
            'properties': { 'cancelCount': { 'type': 'number' }, 'reasonMessage': { 'type': 'string' } },
            'required': ['cancelCount', 'reasonMessage'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'abortMs': { 'type': 'number' }, 'reasonMessage': { 'type': 'string' }, 'sleepMs': { 'type': 'number' } },
            'required': ['abortMs', 'reasonMessage', 'sleepMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'real-time-abort' }
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
            'properties': { 'resolved': { 'type': 'boolean' }, 'sleepMs': { 'type': 'number' } },
            'required': ['resolved', 'sleepMs'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'scheduler': schedulerInputSchema, 'sleepMs': { 'type': 'number' } },
            'required': ['scheduler', 'sleepMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-zero' }
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
            'properties': { 'resolved': { 'type': 'boolean' }, 'sleepMs': { 'type': 'number' } },
            'required': ['resolved', 'sleepMs'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'sleepMs': { 'type': 'number' } },
            'required': ['sleepMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'default-scheduler' }
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
            'properties': { 'scheduleCount': { 'type': 'number' } },
            'required': ['scheduleCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'reasonMessage': { 'type': 'string' }, 'scheduler': schedulerInputSchema, 'sleepMs': { 'type': 'number' } },
            'required': ['reasonMessage', 'scheduler', 'sleepMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'pre-aborted' }
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
            'properties': { 'cancelCount': { 'type': 'number' }, 'fireCount': { 'type': 'number' }, 'scheduleCount': { 'type': 'number' } },
            'required': ['cancelCount', 'fireCount', 'scheduleCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'reasonMessage': { 'type': 'string' }, 'scheduler': schedulerInputSchema, 'sleepMs': { 'type': 'number' } },
            'required': ['reasonMessage', 'scheduler', 'sleepMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'abort-during-clock' }
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
            'properties': { 'cancelCount': { 'type': 'number' }, 'fireCount': { 'type': 'number' }, 'scheduleCount': { 'type': 'number' } },
            'required': ['cancelCount', 'fireCount', 'scheduleCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'reasonMessage': { 'type': 'string' }, 'scheduler': schedulerInputSchema, 'sleepMs': { 'type': 'number' } },
            'required': ['reasonMessage', 'scheduler', 'sleepMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'abort-during-schedule' }
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
            'properties': { 'cancelCount': { 'type': 'number' }, 'fireCount': { 'type': 'number' } },
            'required': ['cancelCount', 'fireCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'reasonMessage': { 'type': 'string' }, 'scheduler': schedulerInputSchema, 'sleepMs': { 'type': 'number' } },
            'required': ['reasonMessage', 'scheduler', 'sleepMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'pending-abort' }
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
            'properties': { 'cancelCount': { 'type': 'number' }, 'fireCount': { 'type': 'number' } },
            'required': ['cancelCount', 'fireCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'reasonMessage': { 'type': 'string' }, 'scheduler': schedulerInputSchema, 'sleepMs': { 'type': 'number' } },
            'required': ['reasonMessage', 'scheduler', 'sleepMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'late-abort' }
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
            'properties': { 'errorMessage': { 'type': 'string' }, 'listenerCountUnchanged': { 'type': 'boolean' } },
            'required': ['errorMessage', 'listenerCountUnchanged'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'schedulerErrorMessage': { 'type': 'string' }, 'sleepMs': { 'type': 'number' } },
            'required': ['schedulerErrorMessage', 'sleepMs'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'schedule-failure' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  const SchedulerInputNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'counter': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'startMs': SchemaNode.defineNumber({ 'type': 'number' } as const) },
        ['startMs'] as const,
        { 'additionalProperties': false }
      )
    },
    ['counter'] as const,
    { 'additionalProperties': false }
  );

  export const Node = SchemaNode.defineOneOf([
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'elapsedMsAtLeast': SchemaNode.defineNumber({ 'type': 'number' } as const) },
          ['elapsedMsAtLeast'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'sleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const) },
          ['sleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('real-time-sleep' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'resolved': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'virtualSleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['resolved', 'virtualSleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'scheduler': SchedulerInputNode, 'sleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const) },
          ['scheduler', 'sleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('virtual-sleep' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'cancelCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'reasonMessage': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          ['cancelCount', 'reasonMessage'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'abortMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'reasonMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'sleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['abortMs', 'reasonMessage', 'sleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('real-time-abort' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'resolved': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'sleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['resolved', 'sleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'scheduler': SchedulerInputNode, 'sleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const) },
          ['scheduler', 'sleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('virtual-zero' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'resolved': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'sleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['resolved', 'sleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'sleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const) },
          ['sleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('default-scheduler' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'scheduleCount': SchemaNode.defineNumber({ 'type': 'number' } as const) },
          ['scheduleCount'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'reasonMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'scheduler': SchedulerInputNode,
            'sleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['reasonMessage', 'scheduler', 'sleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('pre-aborted' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'cancelCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'fireCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'scheduleCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['cancelCount', 'fireCount', 'scheduleCount'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'reasonMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'scheduler': SchedulerInputNode,
            'sleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['reasonMessage', 'scheduler', 'sleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('abort-during-clock' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'cancelCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'fireCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'scheduleCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['cancelCount', 'fireCount', 'scheduleCount'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'reasonMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'scheduler': SchedulerInputNode,
            'sleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['reasonMessage', 'scheduler', 'sleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('abort-during-schedule' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'cancelCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'fireCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['cancelCount', 'fireCount'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'reasonMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'scheduler': SchedulerInputNode,
            'sleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['reasonMessage', 'scheduler', 'sleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('pending-abort' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'cancelCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'fireCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['cancelCount', 'fireCount'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'reasonMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'scheduler': SchedulerInputNode,
            'sleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['reasonMessage', 'scheduler', 'sleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('late-abort' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'listenerCountUnchanged': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['errorMessage', 'listenerCountUnchanged'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'schedulerErrorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'sleepMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['schedulerErrorMessage', 'sleepMs'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('schedule-failure' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    )
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
