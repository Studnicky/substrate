import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SCENARIO_SHAPES = [
  'afterAcquire-error-does-not-stop-queue',
  'afterAcquire-immediate',
  'afterAcquire-separate-keys',
  'afterAcquire-waiting',
  'afterRelease-fires',
  'afterRelease-fires-on-handoff-and-drop',
  'async-hook-rejections-are-recorded',
  'beforeAcquire-error-is-recorded',
  'beforeRelease-fires',
  'beforeRelease-tracks-hold-time',
  'hook-errors-do-not-break-locking',
  'onAcquireWait-not-immediate',
  'onAcquireWait-per-waiter',
  'onAcquireWait-queued',
  'onContended-fires',
  'onQueueDrain-normal',
  'onQueueDrain-not-early',
  'onQueueDrain-throw-does-not-replace-handoff',
  'onQueueDrain-timeout',
  'onRelease-every-release',
  'onRelease-handoff',
  'onRelease-throw-does-not-replace-release',
  'onTimeout-fires',
  'onTimeout-throw-does-not-replace-error',
  'tracks-all-metrics'
] as const;

/**
 * The scenario case shape `observability.loop.spec.ts` exercises across 25 hook-observation
 * behaviors. Every field is optional here — the spec's own `read*` helpers (readNumber,
 * readString, readStringArray, ...) do the per-shape narrowing and throw a clear error when a
 * shape's scenario is missing a field it actually needs, exactly as they did before this
 * conversion; this entity's job is only to prove the fixture file itself is well-formed JSON
 * matching the fields the spec is known to read, not to model a strict per-shape union.
 */
export namespace ObservabilityScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'acquireEvents': { 'oneOf': [{ 'type': 'number' }, { 'items': { 'type': 'string' }, 'type': 'array' }] },
          'acquireWaitCount': { 'type': 'number' },
          'acquiredCount': { 'type': 'number' },
          'acquiredKeys': { 'items': { 'type': 'string' }, 'type': 'array' },
          'afterReleaseEvents': { 'items': { 'type': 'string' }, 'type': 'array' },
          'afterReleaseEventsAfterDrop': { 'items': { 'type': 'string' }, 'type': 'array' },
          'afterReleaseEventsAfterHandoff': { 'items': { 'type': 'string' }, 'type': 'array' },
          'contentionEvents': { 'type': 'number' },
          'errorName': { 'type': 'string' },
          'holdTimeMsMin': { 'type': 'number' },
          'hookErrorCount': { 'type': 'number' },
          'hookName': { 'type': 'string' },
          'hookNames': { 'items': { 'type': 'string' }, 'type': 'array' },
          'lockedAfterRelease': { 'type': 'boolean' },
          'onReleaseCount': { 'type': 'number' },
          'onReleaseEventsAfterDrop': { 'items': { 'type': 'string' }, 'type': 'array' },
          'queueContinues': { 'type': 'boolean' },
          'queueDrainCount': { 'type': 'number' },
          'queueSize': { 'type': 'number' },
          'releaseEvents': { 'type': 'number' },
          'released': { 'type': 'boolean' },
          'releasedCount': { 'type': 'number' },
          'secondWaitTimeMsMin': { 'type': 'number' },
          'timeoutMs': { 'type': 'number' },
          'unhandledRejections': { 'type': 'number' },
          'waitTimeMsMax': { 'type': 'number' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'batch': {
            'additionalProperties': false,
            'properties': { 'pendingCount': { 'type': 'number' } },
            'required': [],
            'type': 'object'
          },
          'holdMs': { 'oneOf': [{ 'type': 'number' }, { 'items': { 'type': 'number' }, 'type': 'array' }] },
          'key': { 'minLength': 1, 'type': 'string' },
          'keys': { 'items': { 'type': 'string' }, 'type': 'array' },
          'mutex': {
            'additionalProperties': false,
            'properties': { 'timeout': { 'type': 'number' } },
            'required': [],
            'type': 'object'
          },
          'waitMs': { 'type': 'number' }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SCENARIO_SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'acquireEvents': SchemaNode.defineOneOf({}, [SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)]),
          'acquireWaitCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'acquiredCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'acquiredKeys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'afterReleaseEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'afterReleaseEventsAfterDrop': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'afterReleaseEventsAfterHandoff': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'contentionEvents': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'errorName': SchemaNode.defineString({ 'type': 'string' } as const),
          'holdTimeMsMin': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'hookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'hookName': SchemaNode.defineString({ 'type': 'string' } as const),
          'hookNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'lockedAfterRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'onReleaseCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'onReleaseEventsAfterDrop': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'queueContinues': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'queueDrainCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'queueSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'releaseEvents': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'released': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'releasedCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'secondWaitTimeMsMin': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'waitTimeMsMax': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'pendingCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          'holdMs': SchemaNode.defineOneOf({}, [SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)]),
          'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'keys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
          'mutex': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timeout': SchemaNode.defineNumber({ 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          'waitMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, SCENARIO_SHAPES)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
