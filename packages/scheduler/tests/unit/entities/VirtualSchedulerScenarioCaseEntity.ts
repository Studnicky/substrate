import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The 12 scenario shapes `VirtualScheduler.loop.spec.ts` exercises. */
export namespace VirtualSchedulerScenarioCaseEntity {
  const numberArraySchema = { 'items': { 'type': 'number' }, 'type': 'array' } as const;
  const openBagSchema = { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' } as const;

  const heapTaskMutationSchema = {
    'additionalProperties': false,
    'properties': { 'atMs': { 'type': 'number' }, 'id': { 'type': 'string' } },
    'required': [],
    'type': 'object'
  } as const;
  const heapTaskDescriptorSchema = {
    'additionalProperties': false,
    'properties': {
      'atMs': { 'type': 'number' },
      'fire': { 'const': 'noop' },
      'id': { 'type': 'string' },
      'intervalMs': { 'type': 'number' },
      'mutation': heapTaskMutationSchema,
      'variant': { 'enum': ['interval', 'timeout'] }
    },
    'required': ['atMs', 'fire', 'id', 'intervalMs', 'variant'],
    'type': 'object'
  } as const;

  const NumberArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const));
  const OpenBagNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true });

  const HeapTaskMutationNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'id': SchemaNode.defineString({ 'type': 'string' } as const) },
    [] as const,
    { 'additionalProperties': false }
  );
  export const HeapTaskDescriptorNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'fire': SchemaNode.defineConst('noop' as const),
      'id': SchemaNode.defineString({ 'type': 'string' } as const),
      'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'mutation': HeapTaskMutationNode,
      'variant': SchemaNode.defineEnum(['interval', 'timeout'] as const)
    },
    ['atMs', 'fire', 'id', 'intervalMs', 'variant'] as const,
    { 'additionalProperties': false }
  );
  export type HeapTaskDescriptor = NodeStaticType<typeof HeapTaskDescriptorNode>;

  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'finalNowMs': { 'type': 'number' } },
            'required': ['finalNowMs'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scheduler': {
                'additionalProperties': false,
                'properties': {
                  'counterAdvanceScenarios': {
                    'items': {
                      'additionalProperties': false,
                      'properties': { 'advances': numberArraySchema, 'expectedNowMs': { 'type': 'number' }, 'start': { 'type': 'number' } },
                      'required': ['advances', 'expectedNowMs', 'start'],
                      'type': 'object'
                    },
                    'type': 'array'
                  },
                  'edgeCases': {
                    'items': {
                      'additionalProperties': false,
                      'properties': { 'advance': { 'type': 'number' }, 'expectedNowMs': { 'type': 'number' }, 'start': { 'type': 'number' } },
                      'required': ['advance', 'expectedNowMs', 'start'],
                      'type': 'object'
                    },
                    'type': 'array'
                  },
                  'finalCounterAdvances': numberArraySchema,
                  'finalCounterStartMs': { 'type': 'number' },
                  'negativeStartMs': { 'type': 'number' }
                },
                'required': ['counterAdvanceScenarios', 'edgeCases', 'finalCounterAdvances', 'finalCounterStartMs', 'negativeStartMs'],
                'type': 'object'
              }
            },
            'required': ['scheduler'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-timecounter' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': openBagSchema,
          'input': {
            'additionalProperties': false,
            'properties': { 'scheduler': openBagSchema },
            'required': ['scheduler'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'invalid-constructor' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': openBagSchema,
          'input': {
            'additionalProperties': false,
            'properties': {
              'scheduler': {
                'additionalProperties': false,
                'properties': { 'invalidIntervals': numberArraySchema, 'startMs': { 'type': 'number' } },
                'required': ['invalidIntervals', 'startMs'],
                'type': 'object'
              }
            },
            'required': ['scheduler'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'invalid-interval' }
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
              'peekAtMs': { 'type': 'number' },
              'removedMinimum': {
                'additionalProperties': false,
                'properties': {
                  'atMs': { 'type': 'number' },
                  'id': { 'type': 'string' },
                  'intervalMs': { 'type': 'number' },
                  'variant': { 'enum': ['interval', 'timeout'] }
                },
                'required': ['atMs', 'id', 'intervalMs', 'variant'],
                'type': 'object'
              },
              'secondPeekAtMs': { 'type': 'number' }
            },
            'required': ['peekAtMs', 'removedMinimum', 'secondPeekAtMs'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scheduler': {
                'additionalProperties': false,
                'properties': { 'tasks': { 'items': heapTaskDescriptorSchema, 'type': 'array' } },
                'required': ['tasks'],
                'type': 'object'
              }
            },
            'required': ['scheduler'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'minimum-heap' }
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
            'properties': { 'drainedAtMs': numberArraySchema, 'drainedIds': { 'items': { 'type': 'string' }, 'type': 'array' }, 'empty': { 'type': 'boolean' } },
            'required': ['drainedAtMs', 'drainedIds', 'empty'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scheduler': {
                'additionalProperties': false,
                'properties': { 'tasks': { 'items': heapTaskDescriptorSchema, 'type': 'array' } },
                'required': ['tasks'],
                'type': 'object'
              }
            },
            'required': ['scheduler'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'minimum-heap-drain-order' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': {
              'additionalProperties': false,
              'properties': { 'atMs': { 'type': 'number' }, 'fired': { 'type': 'boolean' }, 'idNonEmpty': { 'type': 'boolean' } },
              'required': ['atMs', 'fired', 'idNonEmpty'],
              'type': 'object'
            },
            'properties': {},
            'required': [],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scheduler': {
                'additionalProperties': false,
                'properties': {
                  'runs': {
                    'items': {
                      'additionalProperties': false,
                      'properties': {
                        'advanceMs': { 'type': 'number' },
                        'atMs': { 'type': 'number' },
                        'counterStartMs': { 'type': 'number' },
                        'expectedKey': { 'type': 'string' }
                      },
                      'required': ['advanceMs', 'atMs', 'counterStartMs', 'expectedKey'],
                      'type': 'object'
                    },
                    'type': 'array'
                  }
                },
                'required': ['runs'],
                'type': 'object'
              }
            },
            'required': ['scheduler'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'scheduleAt' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': { 'type': 'number' }, 'properties': {}, 'required': [], 'type': 'object' },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scheduler': {
                'additionalProperties': false,
                'properties': {
                  'runs': {
                    'items': {
                      'additionalProperties': false,
                      'properties': {
                        'advanceMs': { 'type': 'number' },
                        'counterStartMs': { 'type': 'number' },
                        'expectedKey': { 'type': 'string' },
                        'intervalMs': { 'type': 'number' }
                      },
                      'required': ['advanceMs', 'counterStartMs', 'expectedKey', 'intervalMs'],
                      'type': 'object'
                    },
                    'type': 'array'
                  }
                },
                'required': ['runs'],
                'type': 'object'
              }
            },
            'required': ['scheduler'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'scheduleEvery' }
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
            'properties': { 'cancelAllFireCount': { 'type': 'number' }, 'runAllFireCount': { 'type': 'number' } },
            'required': ['cancelAllFireCount', 'runAllFireCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'batch': {
                'additionalProperties': false,
                'properties': { 'cancelAllTaskCount': { 'type': 'number' }, 'runAllTaskCount': { 'type': 'number' } },
                'required': ['cancelAllTaskCount', 'runAllTaskCount'],
                'type': 'object'
              },
              'scheduler': {
                'additionalProperties': false,
                'properties': {
                  'cancelAll': {
                    'additionalProperties': false,
                    'properties': { 'advanceMs': { 'type': 'number' }, 'atMs': { 'type': 'number' }, 'counterStartMs': { 'type': 'number' } },
                    'required': ['advanceMs', 'atMs', 'counterStartMs'],
                    'type': 'object'
                  },
                  'runAll': {
                    'additionalProperties': false,
                    'properties': { 'counterStartMs': { 'type': 'number' }, 'taskStepMs': { 'type': 'number' } },
                    'required': ['counterStartMs', 'taskStepMs'],
                    'type': 'object'
                  }
                },
                'required': ['cancelAll', 'runAll'],
                'type': 'object'
              }
            },
            'required': ['batch', 'scheduler'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'cancelAll-runAll' }
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
              'cancelledFired': { 'type': 'boolean' },
              'cancelledIntervalCount': { 'type': 'number' },
              'cancelledTaskAtMs': { 'type': 'number' },
              'emptyRecordCount': { 'type': 'number' },
              'intervalCount': { 'type': 'number' },
              'invalidIntervalErrorCount': { 'type': 'number' },
              'runUntilFirstFired': { 'type': 'boolean' },
              'runUntilSecondFired': { 'type': 'boolean' },
              'skippedCount': { 'type': 'number' }
            },
            'required': [
              'cancelledFired', 'cancelledIntervalCount', 'cancelledTaskAtMs', 'emptyRecordCount', 'intervalCount',
              'invalidIntervalErrorCount', 'runUntilFirstFired', 'runUntilSecondFired', 'skippedCount'
            ],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'batch': {
                'additionalProperties': false,
                'properties': { 'skipCount': { 'type': 'number' } },
                'required': ['skipCount'],
                'type': 'object'
              },
              'scheduler': {
                'additionalProperties': false,
                'properties': {
                  'cancelledAdvanceMs': { 'type': 'number' },
                  'cancelledAtMs': { 'type': 'number' },
                  'cancelledIntervalFirstAdvanceMs': { 'type': 'number' },
                  'cancelledIntervalSecondAdvanceMs': { 'type': 'number' },
                  'counterStartMs': { 'type': 'number' },
                  'emptyAdvanceMs': { 'type': 'number' },
                  'intervalAdvanceMs': { 'type': 'number' },
                  'intervalMs': { 'type': 'number' },
                  'invalidIntervals': numberArraySchema,
                  'runUntilAtMs': { 'type': 'number' },
                  'runUntilFirstAtMs': { 'type': 'number' },
                  'runUntilSecondAtMs': { 'type': 'number' },
                  'stepMs': { 'type': 'number' }
                },
                'required': [
                  'cancelledAdvanceMs', 'cancelledAtMs', 'cancelledIntervalFirstAdvanceMs', 'cancelledIntervalSecondAdvanceMs',
                  'counterStartMs', 'emptyAdvanceMs', 'intervalAdvanceMs', 'intervalMs', 'invalidIntervals', 'runUntilAtMs',
                  'runUntilFirstAtMs', 'runUntilSecondAtMs', 'stepMs'
                ],
                'type': 'object'
              }
            },
            'required': ['batch', 'scheduler'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'edge-cases' }
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
              'advanceCounterNowMs': { 'type': 'number' },
              'advanceFired': { 'type': 'boolean' },
              'cancelledFired': { 'type': 'boolean' },
              'providerNowMs': { 'type': 'number' }
            },
            'required': ['advanceCounterNowMs', 'advanceFired', 'cancelledFired', 'providerNowMs'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scheduler': {
                'additionalProperties': false,
                'properties': {
                  'advanceCounterStartMs': { 'type': 'number' },
                  'advanceDeltas': numberArraySchema,
                  'advanceFiredAtMs': { 'type': 'number' },
                  'cancelAtMs': { 'type': 'number' },
                  'cancelledCounterStartMs': { 'type': 'number' },
                  'providerNowMs': { 'type': 'number' },
                  'runAllCounterStartMs': { 'type': 'number' },
                  'runAllRejectAtMs': { 'type': 'number' },
                  'runUntilAdvanceMs': { 'type': 'number' },
                  'runUntilCounterStartMs': { 'type': 'number' },
                  'runUntilRejectAtMs': { 'type': 'number' }
                },
                'required': [
                  'advanceCounterStartMs', 'advanceDeltas', 'advanceFiredAtMs', 'cancelAtMs', 'cancelledCounterStartMs',
                  'providerNowMs', 'runAllCounterStartMs', 'runAllRejectAtMs', 'runUntilAdvanceMs', 'runUntilCounterStartMs',
                  'runUntilRejectAtMs'
                ],
                'type': 'object'
              }
            },
            'required': ['scheduler'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'unhappy-path' }
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
            'properties': { 'errorsPerScheduler': { 'type': 'number' }, 'firedAfterIntervalFailure': { 'type': 'number' } },
            'required': ['errorsPerScheduler', 'firedAfterIntervalFailure'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'scheduler': {
                'additionalProperties': false,
                'properties': {
                  'atMs': { 'type': 'number' },
                  'counterStartMs': { 'type': 'number' },
                  'intervalAdvanceDeltas': numberArraySchema,
                  'intervalMs': { 'type': 'number' }
                },
                'required': ['atMs', 'counterStartMs', 'intervalAdvanceDeltas', 'intervalMs'],
                'type': 'object'
              }
            },
            'required': ['scheduler'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'virtual-fire-error-loop' }
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
              'advanceCount': { 'type': 'number' },
              'asyncErrorCount': { 'type': 'number' },
              'cancelAfterFireCancelCount': { 'type': 'number' },
              'cancelAfterFireFireCount': { 'type': 'number' },
              'cancelAllCount': { 'type': 'number' },
              'cancelCheckerCancelled': { 'type': 'boolean' },
              'cancelCount': { 'type': 'number' },
              'cancelRepeatCount': { 'type': 'number' },
              'cancelRepeatFireCount': { 'type': 'number' },
              'counterAccessorNowMs': { 'type': 'number' },
              'fireCount': { 'type': 'number' },
              'fireErrorCount': { 'type': 'number' },
              'heapCreatedCount': { 'type': 'number' },
              'heapFired': { 'type': 'boolean' },
              'idleCount': { 'type': 'number' },
              'idlePartialCount': { 'type': 'number' },
              'observedCauseMessage': { 'type': 'string' },
              'observedHookName': { 'type': 'string' },
              'recordedHookNames': { 'items': { 'type': 'string' }, 'type': 'array' },
              'rejectionEventsLength': { 'type': 'number' },
              'rescheduleAtMs': numberArraySchema,
              'rescheduleCount': { 'type': 'number' },
              'scheduleCount': { 'type': 'number' },
              'throwingFireErrorCount': { 'type': 'number' },
              'throwingFireFired': { 'type': 'boolean' },
              'throwingRescheduleFireCount': { 'type': 'number' },
              'throwingScheduleIdNonEmpty': { 'type': 'boolean' }
            },
            'required': [
              'advanceCount', 'asyncErrorCount', 'cancelAfterFireCancelCount', 'cancelAfterFireFireCount', 'cancelAllCount',
              'cancelCheckerCancelled', 'cancelCount', 'cancelRepeatCount', 'cancelRepeatFireCount', 'counterAccessorNowMs',
              'fireCount', 'fireErrorCount', 'heapCreatedCount', 'heapFired', 'idleCount', 'idlePartialCount',
              'observedCauseMessage', 'observedHookName', 'recordedHookNames', 'rejectionEventsLength', 'rescheduleAtMs',
              'rescheduleCount', 'scheduleCount', 'throwingFireErrorCount', 'throwingFireFired', 'throwingRescheduleFireCount',
              'throwingScheduleIdNonEmpty'
            ],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'batch': {
                'additionalProperties': false,
                'properties': { 'repeatCancelCount': { 'type': 'number' } },
                'required': ['repeatCancelCount'],
                'type': 'object'
              },
              'scheduler': {
                'additionalProperties': false,
                'properties': {
                  'advanceMs': { 'type': 'number' },
                  'auditScenarios': {
                    'items': {
                      'additionalProperties': false,
                      'properties': {
                        'action': {
                          'enum': ['advance', 'schedule', 'schedule-and-advance', 'schedule-and-cancel', 'schedule-and-cancel-all']
                        },
                        'advanceMs': { 'type': 'number' },
                        'atMs': { 'type': 'number' },
                        'counterStartMs': { 'type': 'number' },
                        'expectedKey': { 'enum': ['advanceCount', 'cancelAllCount', 'cancelCount', 'fireCount', 'scheduleCount'] }
                      },
                      'required': ['action', 'counterStartMs', 'expectedKey'],
                      'type': 'object'
                    },
                    'type': 'array'
                  },
                  'cancelAfterFireAtMs': { 'type': 'number' },
                  'cancelAtMs': { 'type': 'number' },
                  'counterStartMs': { 'type': 'number' },
                  'fireErrorAtMs': { 'type': 'number' },
                  'fireRejectAtMs': { 'type': 'number' },
                  'heapAtMs': { 'type': 'number' },
                  'idleAdvanceMs': { 'type': 'number' },
                  'idleAtMs': { 'type': 'number' },
                  'idleSecondAtMs': { 'type': 'number' },
                  'intervalMs': { 'type': 'number' },
                  'rescheduleAdvanceMs': { 'type': 'number' },
                  'scheduleAtMs': { 'type': 'number' }
                },
                'required': [
                  'advanceMs', 'auditScenarios', 'cancelAfterFireAtMs', 'cancelAtMs', 'counterStartMs', 'fireErrorAtMs',
                  'fireRejectAtMs', 'heapAtMs', 'idleAdvanceMs', 'idleAtMs', 'idleSecondAtMs', 'intervalMs',
                  'rescheduleAdvanceMs', 'scheduleAtMs'
                ],
                'type': 'object'
              }
            },
            'required': ['batch', 'scheduler'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'subclass-seams' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'finalNowMs': SchemaNode.defineNumber({ 'type': 'number' } as const) },
          ['finalNowMs'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'scheduler': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'counterAdvanceScenarios': SchemaNode.defineArray(
                  { 'type': 'array' } as const,
                  SchemaNode.defineObject(
                    { 'type': 'object' } as const,
                    {
                      'advances': NumberArrayNode,
                      'expectedNowMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                      'start': SchemaNode.defineNumber({ 'type': 'number' } as const)
                    },
                    ['advances', 'expectedNowMs', 'start'] as const,
                    { 'additionalProperties': false }
                  )
                ),
                'edgeCases': SchemaNode.defineArray(
                  { 'type': 'array' } as const,
                  SchemaNode.defineObject(
                    { 'type': 'object' } as const,
                    {
                      'advance': SchemaNode.defineNumber({ 'type': 'number' } as const),
                      'expectedNowMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                      'start': SchemaNode.defineNumber({ 'type': 'number' } as const)
                    },
                    ['advance', 'expectedNowMs', 'start'] as const,
                    { 'additionalProperties': false }
                  )
                ),
                'finalCounterAdvances': NumberArrayNode,
                'finalCounterStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'negativeStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
              },
              ['counterAdvanceScenarios', 'edgeCases', 'finalCounterAdvances', 'finalCounterStartMs', 'negativeStartMs'] as const,
              { 'additionalProperties': false }
            )
          },
          ['scheduler'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('virtual-timecounter' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': OpenBagNode,
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'scheduler': OpenBagNode },
          ['scheduler'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('invalid-constructor' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': OpenBagNode,
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'scheduler': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'invalidIntervals': NumberArrayNode, 'startMs': SchemaNode.defineNumber({ 'type': 'number' } as const) },
              ['invalidIntervals', 'startMs'] as const,
              { 'additionalProperties': false }
            )
          },
          ['scheduler'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('invalid-interval' as const)
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
            'peekAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'removedMinimum': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'id': SchemaNode.defineString({ 'type': 'string' } as const),
                'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'variant': SchemaNode.defineEnum(['interval', 'timeout'] as const)
              },
              ['atMs', 'id', 'intervalMs', 'variant'] as const,
              { 'additionalProperties': false }
            ),
            'secondPeekAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['peekAtMs', 'removedMinimum', 'secondPeekAtMs'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'scheduler': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'tasks': SchemaNode.defineArray({ 'type': 'array' } as const, HeapTaskDescriptorNode) },
              ['tasks'] as const,
              { 'additionalProperties': false }
            )
          },
          ['scheduler'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('minimum-heap' as const)
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
            'drainedAtMs': NumberArrayNode,
            'drainedIds': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
            'empty': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          ['drainedAtMs', 'drainedIds', 'empty'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'scheduler': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'tasks': SchemaNode.defineArray({ 'type': 'array' } as const, HeapTaskDescriptorNode) },
              ['tasks'] as const,
              { 'additionalProperties': false }
            )
          },
          ['scheduler'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('minimum-heap-drain-order' as const)
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
          {},
          [] as const,
          {
            'additionalProperties': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'fired': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
                'idNonEmpty': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
              },
              ['atMs', 'fired', 'idNonEmpty'] as const,
              { 'additionalProperties': false }
            )
          }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'scheduler': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'runs': SchemaNode.defineArray(
                  { 'type': 'array' } as const,
                  SchemaNode.defineObject(
                    { 'type': 'object' } as const,
                    {
                      'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                      'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                      'counterStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                      'expectedKey': SchemaNode.defineString({ 'type': 'string' } as const)
                    },
                    ['advanceMs', 'atMs', 'counterStartMs', 'expectedKey'] as const,
                    { 'additionalProperties': false }
                  )
                )
              },
              ['runs'] as const,
              { 'additionalProperties': false }
            )
          },
          ['scheduler'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('scheduleAt' as const)
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
          {},
          [] as const,
          { 'additionalProperties': SchemaNode.defineNumber({ 'type': 'number' } as const) }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'scheduler': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'runs': SchemaNode.defineArray(
                  { 'type': 'array' } as const,
                  SchemaNode.defineObject(
                    { 'type': 'object' } as const,
                    {
                      'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                      'counterStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                      'expectedKey': SchemaNode.defineString({ 'type': 'string' } as const),
                      'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
                    },
                    ['advanceMs', 'counterStartMs', 'expectedKey', 'intervalMs'] as const,
                    { 'additionalProperties': false }
                  )
                )
              },
              ['runs'] as const,
              { 'additionalProperties': false }
            )
          },
          ['scheduler'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('scheduleEvery' as const)
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
            'cancelAllFireCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'runAllFireCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['cancelAllFireCount', 'runAllFireCount'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'batch': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'cancelAllTaskCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'runAllTaskCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
              },
              ['cancelAllTaskCount', 'runAllTaskCount'] as const,
              { 'additionalProperties': false }
            ),
            'scheduler': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'cancelAll': SchemaNode.defineObject(
                  { 'type': 'object' } as const,
                  {
                    'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                    'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                    'counterStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
                  },
                  ['advanceMs', 'atMs', 'counterStartMs'] as const,
                  { 'additionalProperties': false }
                ),
                'runAll': SchemaNode.defineObject(
                  { 'type': 'object' } as const,
                  {
                    'counterStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                    'taskStepMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
                  },
                  ['counterStartMs', 'taskStepMs'] as const,
                  { 'additionalProperties': false }
                )
              },
              ['cancelAll', 'runAll'] as const,
              { 'additionalProperties': false }
            )
          },
          ['batch', 'scheduler'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('cancelAll-runAll' as const)
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
            'cancelledFired': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'cancelledIntervalCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'cancelledTaskAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'emptyRecordCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'intervalCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'invalidIntervalErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'runUntilFirstFired': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'runUntilSecondFired': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'skippedCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          [
            'cancelledFired', 'cancelledIntervalCount', 'cancelledTaskAtMs', 'emptyRecordCount', 'intervalCount',
            'invalidIntervalErrorCount', 'runUntilFirstFired', 'runUntilSecondFired', 'skippedCount'
          ] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'batch': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'skipCount': SchemaNode.defineNumber({ 'type': 'number' } as const) },
              ['skipCount'] as const,
              { 'additionalProperties': false }
            ),
            'scheduler': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'cancelledAdvanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'cancelledAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'cancelledIntervalFirstAdvanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'cancelledIntervalSecondAdvanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'counterStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'emptyAdvanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'intervalAdvanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'invalidIntervals': NumberArrayNode,
                'runUntilAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'runUntilFirstAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'runUntilSecondAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'stepMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
              },
              [
                'cancelledAdvanceMs', 'cancelledAtMs', 'cancelledIntervalFirstAdvanceMs', 'cancelledIntervalSecondAdvanceMs',
                'counterStartMs', 'emptyAdvanceMs', 'intervalAdvanceMs', 'intervalMs', 'invalidIntervals', 'runUntilAtMs',
                'runUntilFirstAtMs', 'runUntilSecondAtMs', 'stepMs'
              ] as const,
              { 'additionalProperties': false }
            )
          },
          ['batch', 'scheduler'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('edge-cases' as const)
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
            'advanceCounterNowMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'advanceFired': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'cancelledFired': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'providerNowMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['advanceCounterNowMs', 'advanceFired', 'cancelledFired', 'providerNowMs'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'scheduler': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'advanceCounterStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'advanceDeltas': NumberArrayNode,
                'advanceFiredAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'cancelAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'cancelledCounterStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'providerNowMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'runAllCounterStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'runAllRejectAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'runUntilAdvanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'runUntilCounterStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'runUntilRejectAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
              },
              [
                'advanceCounterStartMs', 'advanceDeltas', 'advanceFiredAtMs', 'cancelAtMs', 'cancelledCounterStartMs',
                'providerNowMs', 'runAllCounterStartMs', 'runAllRejectAtMs', 'runUntilAdvanceMs', 'runUntilCounterStartMs',
                'runUntilRejectAtMs'
              ] as const,
              { 'additionalProperties': false }
            )
          },
          ['scheduler'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('unhappy-path' as const)
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
            'errorsPerScheduler': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'firedAfterIntervalFailure': SchemaNode.defineNumber({ 'type': 'number' } as const)
          },
          ['errorsPerScheduler', 'firedAfterIntervalFailure'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'scheduler': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'counterStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'intervalAdvanceDeltas': NumberArrayNode,
                'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
              },
              ['atMs', 'counterStartMs', 'intervalAdvanceDeltas', 'intervalMs'] as const,
              { 'additionalProperties': false }
            )
          },
          ['scheduler'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('virtual-fire-error-loop' as const)
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
            'advanceCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'asyncErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'cancelAfterFireCancelCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'cancelAfterFireFireCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'cancelAllCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'cancelCheckerCancelled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'cancelCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'cancelRepeatCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'cancelRepeatFireCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'counterAccessorNowMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'fireCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'fireErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'heapCreatedCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'heapFired': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'idleCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'idlePartialCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'observedCauseMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'observedHookName': SchemaNode.defineString({ 'type': 'string' } as const),
            'recordedHookNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
            'rejectionEventsLength': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'rescheduleAtMs': NumberArrayNode,
            'rescheduleCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'scheduleCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'throwingFireErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'throwingFireFired': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
            'throwingRescheduleFireCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'throwingScheduleIdNonEmpty': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
          },
          [
            'advanceCount', 'asyncErrorCount', 'cancelAfterFireCancelCount', 'cancelAfterFireFireCount', 'cancelAllCount',
            'cancelCheckerCancelled', 'cancelCount', 'cancelRepeatCount', 'cancelRepeatFireCount', 'counterAccessorNowMs',
            'fireCount', 'fireErrorCount', 'heapCreatedCount', 'heapFired', 'idleCount', 'idlePartialCount',
            'observedCauseMessage', 'observedHookName', 'recordedHookNames', 'rejectionEventsLength', 'rescheduleAtMs',
            'rescheduleCount', 'scheduleCount', 'throwingFireErrorCount', 'throwingFireFired', 'throwingRescheduleFireCount',
            'throwingScheduleIdNonEmpty'
          ] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'batch': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'repeatCancelCount': SchemaNode.defineNumber({ 'type': 'number' } as const) },
              ['repeatCancelCount'] as const,
              { 'additionalProperties': false }
            ),
            'scheduler': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'auditScenarios': SchemaNode.defineArray(
                  { 'type': 'array' } as const,
                  SchemaNode.defineObject(
                    { 'type': 'object' } as const,
                    {
                      'action': SchemaNode.defineEnum(
                        ['advance', 'schedule', 'schedule-and-advance', 'schedule-and-cancel', 'schedule-and-cancel-all'] as const
                      ),
                      'advanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                      'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                      'counterStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                      'expectedKey': SchemaNode.defineEnum(['advanceCount', 'cancelAllCount', 'cancelCount', 'fireCount', 'scheduleCount'] as const)
                    },
                    ['action', 'counterStartMs', 'expectedKey'] as const,
                    { 'additionalProperties': false }
                  )
                ),
                'cancelAfterFireAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'cancelAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'counterStartMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'fireErrorAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'fireRejectAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'heapAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'idleAdvanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'idleAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'idleSecondAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'rescheduleAdvanceMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
                'scheduleAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
              },
              [
                'advanceMs', 'auditScenarios', 'cancelAfterFireAtMs', 'cancelAtMs', 'counterStartMs', 'fireErrorAtMs',
                'fireRejectAtMs', 'heapAtMs', 'idleAdvanceMs', 'idleAtMs', 'idleSecondAtMs', 'intervalMs',
                'rescheduleAdvanceMs', 'scheduleAtMs'
              ] as const,
              { 'additionalProperties': false }
            )
          },
          ['batch', 'scheduler'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('subclass-seams' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    )
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
