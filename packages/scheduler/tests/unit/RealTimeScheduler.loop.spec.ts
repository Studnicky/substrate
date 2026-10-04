import { HookInvoker, RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import * as timersPromises from 'node:timers/promises';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { RealTimeScheduler } from '../../src/scheduler/RealTimeScheduler.js';
import { RealTimeSchedulerScenarioCaseEntity } from './entities/RealTimeSchedulerScenarioCaseEntity.js';
import scenarioGroups from './RealTimeScheduler.scenarios.json' with { 'type': 'json' };

class AuditScheduler extends RealTimeScheduler {
  public scheduleCount = 0;
  public fireCount = 0;
  public cancelCount = 0;
  public cancelAllCount = 0;

  public constructor() { super(); }

  protected override onSchedule(_id: string, _atMs: number, _variant: 'interval' | 'timeout'): void {
    this.scheduleCount++;
  }

  protected override onFire(_id: string): void {
    this.fireCount++;
  }

  protected override onCancel(_id: string): void {
    this.cancelCount++;
  }

  protected override onCancelAll(): void {
    this.cancelAllCount++;
  }
}

class RealTimeSchedulerRunners {
  static async 'async-onFire-rejection-guarded'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'async-onFire-rejection-guarded'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    const recordedHookNames: string[] = [];
    const recordedCauses: Error[] = [];

    class RecordingSwallowingInvoker extends HookInvoker {
      protected override onHookError(hookName: string, cause: Error): void {
        recordedHookNames.push(hookName);
        recordedCauses.push(cause);
      }
    }

    const rejectionError = RuntimeError.create('async onFire rejection');

    class AsyncRejectingFireScheduler extends RealTimeScheduler {
      protected override readonly hooks: HookInvoker = new RecordingSwallowingInvoker();
      public readonly rejectionError = rejectionError;
      protected override readonly onFire = RealTimeSchedulerRunners.rejectFireAfterTick;
      public constructor() { super(); }
      public static make(): AsyncRejectingFireScheduler {
        return new AsyncRejectingFireScheduler();
      }
    }

    let rejectionEvents = 0;
    const onUnhandledRejection = (): void => {
      rejectionEvents++;
    };
    process.on('unhandledRejection', onUnhandledRejection);

    const sched = AsyncRejectingFireScheduler.make();

    try {
      sched.scheduleAt(Date.now() + input.pastMsOffset, () => { return; });
      await timersPromises.setTimeout(input.waitMs);
      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.strictEqual(rejectionEvents, expected.unhandledRejections);
      assert.deepStrictEqual(recordedHookNames, ['onFire']);
      assert.strictEqual(recordedCauses[0], rejectionError);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
      sched.cancelAll();
    }
  }

  static 'backend-overrides'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'backend-overrides'>): void {
    const batch = scenarioCase.input.batch;
    const input = scenarioCase.input.scheduler;
    class BackendScheduler extends RealTimeScheduler {
      static override create(): BackendScheduler {
        return new BackendScheduler();
      }
      public timeoutCount = 0;
      public intervalCount = 0;
      public clearCount = 0;

      protected override createTimeout(fire: () => void, delayMs: number): ReturnType<typeof setTimeout> {
        this.timeoutCount++;
        const handle = super.createTimeout(fire, delayMs);
        return handle;
      }

      protected override createInterval(fire: () => void, intervalMs: number): ReturnType<typeof setInterval> {
        this.intervalCount++;
        const handle = super.createInterval(fire, intervalMs);
        return handle;
      }

      protected override clearTimer(handle: ReturnType<typeof setTimeout>, variant: 'interval' | 'timeout'): void {
        this.clearCount++;
        super.clearTimer(handle, variant);
      }
    }

    const sched = BackendScheduler.create();
    const timeoutTask = sched.scheduleAt(Date.now() + input.delayMs, () => { return; });
    const intervalTask = sched.scheduleEvery(input.intervalMs, () => { return; });
    const tasks = [timeoutTask, intervalTask];
    assert.strictEqual(tasks.length, batch.taskCount);
    assert.ok(sched.timeoutCount >= 1);
    assert.ok(sched.intervalCount >= 1);
    timeoutTask.cancel();
    intervalTask.cancel();
    assert.ok(sched.clearCount >= 2);
    sched.cancelAll();
  }

  static async 'cancel-after-fire'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'cancel-after-fire'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    const sched = new AuditScheduler();
    let callbackCount = 0;
    const task = sched.scheduleAt(Date.now() + input.delayMs, () => { callbackCount++; });
    await timersPromises.setTimeout(input.waitMs);
    task.cancel();
    task.cancel();
    assert.strictEqual(callbackCount, expected.callbackCount);
    assert.strictEqual(sched.fireCount, expected.fireCount);
    assert.strictEqual(sched.cancelCount, expected.cancelCount);
    sched.cancelAll();
  }

  static 'cancel-before-fire'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'cancel-before-fire'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    const sched = new AuditScheduler();
    const task = sched.scheduleAt(Date.now() + input.delayMs, () => { return; });
    task.cancel();
    task.cancel();
    sched.cancelAll();
    assert.strictEqual(sched.cancelCount, expected.cancelCount);
  }

  static 'cancelAll-clears-multiple'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'cancelAll-clears-multiple'>): void {
    const batch = scenarioCase.input.batch;
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    const sched = new AuditScheduler();
    for (let index = 0; index < batch.taskCount; index++) {
      sched.scheduleAt(Date.now() + input.delayMs, () => { return; });
    }
    assert.strictEqual(sched.scheduleCount, expected.scheduleCount);
    sched.cancelAll();
    assert.strictEqual(sched.cancelAllCount, expected.cancelAllCount);
  }

  static 'cancelAll-empty'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'cancelAll-empty'>): void {
    const batch = scenarioCase.input.batch;
    const expected = scenarioCase.expected;
    const sched = new AuditScheduler();
    assert.strictEqual(batch.taskCount, 0);
    sched.cancelAll();
    assert.strictEqual(sched.scheduleCount, expected.scheduleCount);
    assert.strictEqual(sched.cancelAllCount, expected.cancelAllCount);
  }

  static 'cancelAll-interval-task'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'cancelAll-interval-task'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    const sched = new AuditScheduler();
    sched.scheduleEvery(input.intervalMs, () => { return; });
    sched.cancelAll();
    assert.strictEqual(sched.scheduleCount, expected.scheduleCount);
    assert.strictEqual(sched.cancelAllCount, expected.cancelAllCount);
  }

  static 'chained-timeout-cancel'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'chained-timeout-cancel'>): void {
    const batch = scenarioCase.input.batch;
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    const maximumDelayMs = input.maximumDelayMs;
    const stageCount = batch.chainStageCount;

    class TinyMaximumDelayScheduler extends RealTimeScheduler {
      public fireCount = 0;
      public constructor() { super(); }
      protected override get maximumTimeoutDelayMs(): number {
        return maximumDelayMs;
      }
      protected override onFire(_id: string): void {
        this.fireCount++;
      }
    }

    // Cancels mid-first-stage, then drives the rest of the chain's virtual time to
    // completion deterministically, proving cancellation holds across the whole chain.
    mock.timers.enable({ 'apis': ['Date', 'setTimeout'] });
    try {
      const sched = new TinyMaximumDelayScheduler();
      const atMs = Date.now() + (maximumDelayMs * stageCount);
      let fired = false;
      const task = sched.scheduleAt(atMs, () => { fired = true; });

      mock.timers.tick(maximumDelayMs / 2);
      task.cancel();
      mock.timers.tick((maximumDelayMs * stageCount) - (maximumDelayMs / 2));

      assert.strictEqual(fired, false);
      assert.strictEqual(sched.fireCount, 0);
      assert.strictEqual(!fired && sched.fireCount === 0, expected.completed);
    } finally {
      mock.timers.reset();
    }
  }

  static 'chained-timeout-fire'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'chained-timeout-fire'>): void {
    const batch = scenarioCase.input.batch;
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    const maximumDelayMs = input.maximumDelayMs;
    const stageCount = batch.chainStageCount;

    class TinyMaximumDelayScheduler extends RealTimeScheduler {
      public fireCount = 0;
      public scheduleCount = 0;
      public constructor() { super(); }
      protected override get maximumTimeoutDelayMs(): number {
        return maximumDelayMs;
      }
      protected override onFire(_id: string): void {
        this.fireCount++;
      }
      protected override onSchedule(_id: string, _atMs: number, _variant: 'interval' | 'timeout'): void {
        this.scheduleCount++;
      }
    }

    // Drives the multi-stage chain deterministically: mocks Date.now() and setTimeout
    // so each stage advances by exactly maximumDelayMs, with no reliance on wall-clock margins.
    mock.timers.enable({ 'apis': ['Date', 'setTimeout'] });
    try {
      const sched = new TinyMaximumDelayScheduler();
      const atMs = Date.now() + (maximumDelayMs * stageCount);
      let fired = false;
      const task = sched.scheduleAt(atMs, () => { fired = true; });

      for (let stage = 0; stage < stageCount; stage++) {
        mock.timers.tick(maximumDelayMs);
      }

      assert.strictEqual(fired, expected.completed);
      assert.strictEqual(sched.fireCount, 1);
      assert.strictEqual(sched.scheduleCount, 1);
      assert.strictEqual(task.atMs, atMs);
      sched.cancelAll();
    } finally {
      mock.timers.reset();
    }
  }

  static 'custom-id'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'custom-id'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    class CustomIdScheduler extends RealTimeScheduler {
      public constructor() { super(); }
      protected override generateId(): string {
        return 'custom-id';
      }
    }
    const sched = new CustomIdScheduler();
    const task = sched.scheduleAt(Date.now() + input.delayMs, () => { return; });
    assert.strictEqual(task.id, expected.id);
    sched.cancelAll();
  }

  static 'onCancel-called'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'onCancel-called'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    const sched = new AuditScheduler();
    const task = sched.scheduleAt(Date.now() + input.delayMs, () => { return; });
    task.cancel();
    assert.strictEqual(sched.cancelCount, expected.cancelCount);
    sched.cancelAll();
  }

  static 'onCancelAll-called'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'onCancelAll-called'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    const sched = new AuditScheduler();
    sched.scheduleAt(Date.now() + input.delayMs, () => { return; });
    sched.cancelAll();
    assert.strictEqual(sched.cancelAllCount, expected.cancelAllCount);
  }

  static async 'onDrift-captured'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'onDrift-captured'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    class DriftScheduler extends RealTimeScheduler {
      public driftCount = 0;
      public driftMs: number[] = [];
      public constructor() { super(); }
      protected override onDrift(_id: string, _dueMs: number, _actualMs: number, driftMs: number): void {
        this.driftCount++;
        this.driftMs.push(driftMs);
      }
    }

    const originalNow = Date.now;
    let tick = 0;

    const sched = new DriftScheduler();
    let fired = false;
    try {
      Date.now = (): number => {
        tick += input.clockStepMs;
        return tick;
      };

      sched.scheduleAt(input.atMs, () => { fired = true; });
    } finally {
      Date.now = originalNow;
    }
    await timersPromises.setTimeout(input.waitMs);
    assert.strictEqual(fired, expected.completed);
    assert.strictEqual(sched.driftCount, 1);
    assert.ok(sched.driftMs[0] !== undefined && sched.driftMs[0] > 0);
    sched.cancelAll();
  }

  static async 'onFireError-async'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'onFireError-async'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    class FireErrorHookScheduler extends RealTimeScheduler {
      public fireErrorCount = 0;
      public constructor() { super(); }
      protected override onFireError(_id: string, _error: Error): void {
        this.fireErrorCount++;
      }
    }
    const sched = new FireErrorHookScheduler();
    sched.scheduleAt(Date.now() + input.pastMsOffset, async () => { return await Promise.reject(RuntimeError.create('async reject')); });
    await timersPromises.setTimeout(input.waitMs);
    assert.strictEqual(sched.fireErrorCount, expected.fireErrorCount);
    sched.cancelAll();
  }

  static async 'onFireError-sync'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'onFireError-sync'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    class FireErrorHookScheduler extends RealTimeScheduler {
      public fireErrorCount = 0;
      public constructor() { super(); }
      protected override onFireError(_id: string, _error: Error): void {
        this.fireErrorCount++;
      }
    }
    const sched = new FireErrorHookScheduler();
    sched.scheduleAt(Date.now() + input.pastMsOffset, () => { throw RuntimeError.create('sync throw'); });
    await timersPromises.setTimeout(input.waitMs);
    assert.strictEqual(sched.fireErrorCount, expected.fireErrorCount);
    sched.cancelAll();
  }

  static 'onIdle-after-cancelAll'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'onIdle-after-cancelAll'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    class IdleHookScheduler extends RealTimeScheduler {
      public idleCount = 0;
      public constructor() { super(); }
      protected override onIdle(): void {
        this.idleCount++;
      }
    }
    const sched = new IdleHookScheduler();
    sched.scheduleAt(Date.now() + input.delayMs, () => { return; });
    sched.cancelAll();
    assert.strictEqual(sched.idleCount, expected.idleCount);
  }

  static 'onIdle-empty-cancelAll'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'onIdle-empty-cancelAll'>): void {
    const batch = scenarioCase.input.batch;
    const expected = scenarioCase.expected;
    class IdleHookScheduler extends RealTimeScheduler {
      public idleCount = 0;
      public constructor() { super(); }
      protected override onIdle(): void {
        this.idleCount++;
      }
    }
    const sched = new IdleHookScheduler();
    assert.strictEqual(batch.idleCount, expected.idleCount);
    sched.cancelAll();
    assert.strictEqual(sched.idleCount, expected.idleCount);
  }

  static 'onMiss-future-scheduleAt'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'onMiss-future-scheduleAt'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    class MissHookScheduler extends RealTimeScheduler {
      public missCount = 0;
      public constructor() { super(); }
      protected override onMiss(_id: string, _atMs: number, _nowMs: number): void {
        this.missCount++;
      }
    }
    const sched = new MissHookScheduler();
    const task = sched.scheduleAt(Date.now() + input.futureMsOffset, () => { return; });
    assert.strictEqual(sched.missCount, expected.missCount);
    task.cancel();
    sched.cancelAll();
  }

  static 'onMiss-past-scheduleAt'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'onMiss-past-scheduleAt'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    class MissHookScheduler extends RealTimeScheduler {
      public missIds: string[] = [];
      public missAtMs: number[] = [];
      public constructor() { super(); }
      protected override onMiss(id: string, atMs: number, _nowMs: number): void {
        this.missIds.push(id);
        this.missAtMs.push(atMs);
      }
    }
    const sched = new MissHookScheduler();
    const pastMs = Date.now() + input.pastMsOffset;
    const task = sched.scheduleAt(pastMs, () => { return; });
    assert.strictEqual(sched.missIds.length, expected.missCount);
    assert.strictEqual(sched.missAtMs[0], pastMs);
    task.cancel();
    sched.cancelAll();
  }

  static 'onSchedule-called'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'onSchedule-called'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    class MissHookScheduler extends RealTimeScheduler {
      public scheduleCount = 0;
      public constructor() { super(); }
      protected override onSchedule(_id: string, _atMs: number, _variant: 'interval' | 'timeout'): void {
        this.scheduleCount++;
      }
    }

    const sched = new MissHookScheduler();
    sched.scheduleAt(Date.now() + input.delayMs, () => { return; });
    assert.strictEqual(sched.scheduleCount, expected.scheduleCount);
  }

  static async 'rejecting-scheduleAt'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'rejecting-scheduleAt'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    let rejectionEvents = 0;
    const onUnhandledRejection = (): void => {
      rejectionEvents++;
    };
    const sched = RealTimeScheduler.create();
    const atMs = Date.now() + input.pastMsOffset;
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      sched.scheduleAt(atMs, async () => {
        await Promise.resolve();
        throw RuntimeError.create('scheduleAt reject');
      });
      await timersPromises.setTimeout(input.waitMs);
      assert.strictEqual(rejectionEvents, expected.unhandledRejectionCount);
      sched.cancelAll();
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'rejecting-scheduleEvery'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'rejecting-scheduleEvery'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    let rejectionEvents = 0;
    const onUnhandledRejection = (): void => {
      rejectionEvents++;
    };
    const sched = RealTimeScheduler.create();
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const task = sched.scheduleEvery(input.intervalMs, async () => {
        await Promise.resolve();
        throw RuntimeError.create('scheduleEvery reject');
      });
      await timersPromises.setTimeout(input.waitMs);
      task.cancel();
      sched.cancelAll();
      assert.strictEqual(rejectionEvents, expected.unhandledRejectionCount);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static 'scheduleAt-returns-task'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'scheduleAt-returns-task'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    const sched = RealTimeScheduler.create();
    const atMs = Date.now() + input.delayMs;
    const task = sched.scheduleAt(atMs, () => { return; });
    assert.strictEqual(task.atMs === atMs, expected.atMsMatches);
    assert.strictEqual(task.id.length > 0, expected.hasId);
    task.cancel();
    sched.cancelAll();
  }

  static async 'scheduleEvery-async-reject'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'scheduleEvery-async-reject'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    class FireErrorScheduler extends RealTimeScheduler {
      public fireErrorCount = 0;
      public constructor() { super(); }
      protected override onFireError(_id: string, _error: Error): void {
        this.fireErrorCount++;
      }
    }

    const sched = new FireErrorScheduler();
    const task = sched.scheduleEvery(input.intervalMs, async () => {
      await Promise.resolve();
      throw RuntimeError.create('interval async reject');
    });
    await timersPromises.setTimeout(input.waitMs);
    task.cancel();
    assert.strictEqual(sched.fireErrorCount > 0, expected.completed);
    sched.cancelAll();
  }

  static 'scheduleEvery-returns-task'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'scheduleEvery-returns-task'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    const sched = RealTimeScheduler.create();
    const task = sched.scheduleEvery(input.intervalMs, () => { return; });
    assert.strictEqual(task.atMs > 0, expected.atMsPositive);
    assert.strictEqual(task.id.length > 0, expected.hasId);
    task.cancel();
    sched.cancelAll();
  }

  static async 'scheduleEvery-sync-throw'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'scheduleEvery-sync-throw'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    class FireErrorScheduler extends RealTimeScheduler {
      public fireErrorCount = 0;
      public constructor() { super(); }
      protected override onFireError(_id: string, _error: Error): void {
        this.fireErrorCount++;
      }
    }

    const sched = new FireErrorScheduler();
    const task = sched.scheduleEvery(input.intervalMs, () => { throw RuntimeError.create('interval sync throw'); });
    await timersPromises.setTimeout(input.waitMs);
    task.cancel();
    assert.strictEqual(sched.fireErrorCount > 0, expected.completed);
    sched.cancelAll();
  }

  static 'unique-task-ids'(scenarioCase: ScenarioCaseOfType<RealTimeSchedulerScenarioCaseEntity.Type, 'unique-task-ids'>): void {
    const batch = scenarioCase.input.batch;
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.scheduler;
    const sched = RealTimeScheduler.create();
    const idSet = new Set<string>();
    const taskCount = batch.taskCount;
    for (let index = 0; index < taskCount; index++) {
      const task = sched.scheduleAt(Date.now() + input.delayMs, () => { return; });
      idSet.add(task.id);
    }
    sched.cancelAll();
    assert.strictEqual(idSet.size, taskCount);
    assert.strictEqual(idSet.size === taskCount, expected.uniqueIds);
  }

  private static async rejectFireAfterTick(this: { readonly 'rejectionError': RuntimeError }, _id: string): Promise<void> {
    await Promise.resolve();
    throw this.rejectionError;
  }
}

ScenarioSuite.register({
  'entity': RealTimeSchedulerScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'RealTimeScheduler',
  'runners': RealTimeSchedulerRunners
});
