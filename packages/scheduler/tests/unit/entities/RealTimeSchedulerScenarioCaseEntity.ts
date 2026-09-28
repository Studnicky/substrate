import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `RealTimeScheduler.loop.spec.ts` scenario case shape. `expected`/`batch`/`scheduler` stay open bags — each of the 27 shapes reads a different subset via runtime-checked field helpers, never a cast. */
export namespace RealTimeSchedulerScenarioCaseEntity {
  const openBagSchema = { 'additionalProperties': true, 'properties': {}, 'type': 'object' } as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': openBagSchema,
      'input': {
        'additionalProperties': false,
        'properties': { 'batch': openBagSchema, 'scheduler': openBagSchema },
        'required': ['scheduler'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'async-onFire-rejection-guarded', 'backend-overrides', 'cancel-after-fire', 'cancel-before-fire',
          'cancelAll-clears-multiple', 'cancelAll-empty', 'cancelAll-interval-task', 'chained-timeout-cancel',
          'chained-timeout-fire', 'custom-id', 'onCancel-called', 'onCancelAll-called', 'onDrift-captured',
          'onFireError-async', 'onFireError-sync', 'onIdle-after-cancelAll', 'onIdle-empty-cancelAll',
          'onMiss-future-scheduleAt', 'onMiss-past-scheduleAt', 'onSchedule-called', 'rejecting-scheduleAt',
          'rejecting-scheduleEvery', 'scheduleAt-returns-task', 'scheduleEvery-async-reject',
          'scheduleEvery-returns-task', 'scheduleEvery-sync-throw', 'unique-task-ids'
        ]
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const OpenBagNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} });

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': OpenBagNode,
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': OpenBagNode, 'scheduler': OpenBagNode }, ['scheduler'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, [
        'async-onFire-rejection-guarded', 'backend-overrides', 'cancel-after-fire', 'cancel-before-fire',
        'cancelAll-clears-multiple', 'cancelAll-empty', 'cancelAll-interval-task', 'chained-timeout-cancel',
        'chained-timeout-fire', 'custom-id', 'onCancel-called', 'onCancelAll-called', 'onDrift-captured',
        'onFireError-async', 'onFireError-sync', 'onIdle-after-cancelAll', 'onIdle-empty-cancelAll',
        'onMiss-future-scheduleAt', 'onMiss-past-scheduleAt', 'onSchedule-called', 'rejecting-scheduleAt',
        'rejecting-scheduleEvery', 'scheduleAt-returns-task', 'scheduleEvery-async-reject',
        'scheduleEvery-returns-task', 'scheduleEvery-sync-throw', 'unique-task-ids'
      ] as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
