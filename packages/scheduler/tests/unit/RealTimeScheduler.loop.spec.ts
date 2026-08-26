/**
 * Unit tests for `RealTimeScheduler`.
 */
import assert from 'node:assert/strict';
import { setTimeout as setTimeoutPromise } from 'node:timers/promises';
import {
  describe, it, mock
} from 'node:test';

import { HookInvoker } from '@studnicky/errors';

import { RealTimeScheduler } from '../../src/scheduler/RealTimeScheduler.js';
import scenarioGroups from './RealTimeScheduler.scenarios.json' with { type: 'json' };

type ScenarioInput = {
  batch?: Record<string, boolean | number | string | object | null>;
  scheduler: Record<string, boolean | number | string | object | null>;
};
type ScenarioRunnerContext = {
  batch: Record<string, boolean | number | string | object | null>;
  expected: Record<string, boolean | number | string | object | null>;
  input: Record<string, boolean | number | string | object | null>;
};
type ScenarioRunner = (context: ScenarioRunnerContext) => Promise<void> | void;
type ScenarioCase = {
  description: string;
  expected: Record<string, boolean | number | string | object | null>;
  input: ScenarioInput;
  shape: string;
  name: string;
};

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

function numberField(input: Record<string, boolean | number | string | object | null>, key: string): number {
  const value = input[key];
  if (typeof value !== 'number') {
    throw new Error(`Expected numeric field '${key}'`);
  }
  return value;
}

function futureAtMs(input: Record<string, boolean | number | string | object | null>): number {
  return Date.now() + numberField(input, 'delayMs');
}

const scenarioRunners = {
  'scheduleAt-returns-task': ({ expected, input }): void => {
    const sched = RealTimeScheduler.create();
    const atMs = futureAtMs(input);
    const task = sched.scheduleAt(atMs, () => { return; });
    assert.strictEqual(task.atMs === atMs, expected.atMsMatches);
    assert.strictEqual(task.id.length > 0, expected.hasId);
    task.cancel();
    sched.cancelAll();
  },

  'backend-overrides': ({ batch, input }): void => {
    class BackendScheduler extends RealTimeScheduler {
      public timeoutCount = 0;
      public intervalCount = 0;
      public clearCount = 0;

      protected override createTimeout(fire: () => void, delayMs: number): ReturnType<typeof setTimeout> {
        this.timeoutCount++;
        return super.createTimeout(fire, delayMs);
      }

      protected override createInterval(fire: () => void, intervalMs: number): ReturnType<typeof setInterval> {
        this.intervalCount++;
        return super.createInterval(fire, intervalMs);
      }

      protected override clearTimer(handle: ReturnType<typeof setTimeout>, variant: 'interval' | 'timeout'): void {
        this.clearCount++;
        super.clearTimer(handle, variant);
      }
    }

    const sched = BackendScheduler.create();
    const timeoutTask = sched.scheduleAt(futureAtMs(input), () => { return; });
    const intervalTask = sched.scheduleEvery(numberField(input, 'intervalMs'), () => { return; });
    const tasks = [timeoutTask, intervalTask];
    assert.strictEqual(tasks.length, numberField(batch, 'taskCount'));
    assert.ok(sched.timeoutCount >= 1);
    assert.ok(sched.intervalCount >= 1);
    timeoutTask.cancel();
    intervalTask.cancel();
    assert.ok(sched.clearCount >= 2);
    sched.cancelAll();
  },

  'scheduleEvery-returns-task': ({ expected, input }): void => {
    const sched = RealTimeScheduler.create();
    const task = sched.scheduleEvery(numberField(input, 'intervalMs'), () => { return; });
    assert.strictEqual(task.atMs > 0, expected.atMsPositive);
    assert.strictEqual(task.id.length > 0, expected.hasId);
    task.cancel();
    sched.cancelAll();
  },

  'cancelAll-clears-multiple': ({ batch, expected, input }): void => {
    const sched = new AuditScheduler();
    for (let index = 0; index < numberField(batch, 'taskCount'); index++) {
      sched.scheduleAt(futureAtMs(input), () => { return; });
    }
    assert.strictEqual(sched.scheduleCount, expected.scheduleCount);
    sched.cancelAll();
    assert.strictEqual(sched.cancelAllCount, expected.cancelAllCount);
  },

  'cancel-before-fire': ({ expected, input }): void => {
    const sched = new AuditScheduler();
    const task = sched.scheduleAt(futureAtMs(input), () => { return; });
    task.cancel();
    task.cancel();
    sched.cancelAll();
    assert.strictEqual(sched.cancelCount, expected.cancelCount);
  },

  'cancelAll-interval-task': ({ expected, input }): void => {
    const sched = new AuditScheduler();
    sched.scheduleEvery(numberField(input, 'intervalMs'), () => { return; });
    sched.cancelAll();
    assert.strictEqual(sched.scheduleCount, expected.scheduleCount);
    assert.strictEqual(sched.cancelAllCount, expected.cancelAllCount);
  },

  'cancelAll-empty': ({ batch, expected }): void => {
    const sched = new AuditScheduler();
    assert.strictEqual(numberField(batch, 'taskCount'), 0);
    sched.cancelAll();
    assert.strictEqual(sched.scheduleCount, expected.scheduleCount);
    assert.strictEqual(sched.cancelAllCount, expected.cancelAllCount);
  },

  'unique-task-ids': ({ batch, expected, input }): void => {
    const sched = RealTimeScheduler.create();
    const idSet = new Set<string>();
    const taskCount = numberField(batch, 'taskCount');
    for (let index = 0; index < taskCount; index++) {
      const task = sched.scheduleAt(futureAtMs(input), () => { return; });
      idSet.add(task.id);
    }
    sched.cancelAll();
    assert.strictEqual(idSet.size, taskCount);
    assert.strictEqual(idSet.size === taskCount, expected.uniqueIds);
  },

  'rejecting-scheduleAt': ({ expected, input }): Promise<void> => {
    let rejectionEvents = 0;
    const onUnhandledRejection = (): void => {
      rejectionEvents++;
    };
    const sched = RealTimeScheduler.create();
    const atMs = Date.now() + numberField(input, 'pastMsOffset');
    process.on('unhandledRejection', onUnhandledRejection);
    sched.scheduleAt(atMs, async () => {
      await Promise.resolve();
      throw new Error('scheduleAt reject');
    });
    return setTimeoutPromise(numberField(input, 'waitMs')).then(() => {
      assert.strictEqual(rejectionEvents, expected.unhandledRejectionCount);
      sched.cancelAll();
    }).finally(() => {
      process.off('unhandledRejection', onUnhandledRejection);
    });
  },

  'rejecting-scheduleEvery': ({ expected, input }): Promise<void> => {
    let rejectionEvents = 0;
    const onUnhandledRejection = (): void => {
      rejectionEvents++;
    };
    const sched = RealTimeScheduler.create();
    process.on('unhandledRejection', onUnhandledRejection);
    const task = sched.scheduleEvery(numberField(input, 'intervalMs'), async () => {
      await Promise.resolve();
      throw new Error('scheduleEvery reject');
    });
    return setTimeoutPromise(numberField(input, 'waitMs')).then(() => {
      task.cancel();
      sched.cancelAll();
      assert.strictEqual(rejectionEvents, expected.unhandledRejectionCount);
    }).finally(() => {
      process.off('unhandledRejection', onUnhandledRejection);
    });
  },

  'onSchedule-called': ({ expected, input }): void => {
    class MissHookScheduler extends RealTimeScheduler {
      public scheduleCount = 0;
      public constructor() { super(); }
      protected override onSchedule(_id: string, _atMs: number, _variant: 'interval' | 'timeout'): void {
        this.scheduleCount++;
      }
    }

    const sched = new MissHookScheduler();
    sched.scheduleAt(futureAtMs(input), () => { return; });
    assert.strictEqual(sched.scheduleCount, expected.scheduleCount);
  },

  'onCancel-called': ({ expected, input }): void => {
    const sched = new AuditScheduler();
    const task = sched.scheduleAt(futureAtMs(input), () => { return; });
    task.cancel();
    assert.strictEqual(sched.cancelCount, expected.cancelCount);
    sched.cancelAll();
  },

  'cancel-after-fire': ({ expected, input }): Promise<void> => {
    const sched = new AuditScheduler();
    let callbackCount = 0;
    const task = sched.scheduleAt(Date.now() + numberField(input, 'delayMs'), () => { callbackCount++; });
    return setTimeoutPromise(numberField(input, 'waitMs')).then(() => {
      task.cancel();
      task.cancel();
      assert.strictEqual(callbackCount, expected.callbackCount);
      assert.strictEqual(sched.fireCount, expected.fireCount);
      assert.strictEqual(sched.cancelCount, expected.cancelCount);
      sched.cancelAll();
    });
  },

  'onCancelAll-called': ({ expected, input }): void => {
    const sched = new AuditScheduler();
    sched.scheduleAt(futureAtMs(input), () => { return; });
    sched.cancelAll();
    assert.strictEqual(sched.cancelAllCount, expected.cancelAllCount);
  },

  'custom-id': ({ expected, input }): void => {
    class CustomIdScheduler extends RealTimeScheduler {
      public constructor() { super(); }
      protected override generateId(): string {
        return 'custom-id';
      }
    }
    const sched = new CustomIdScheduler();
    const task = sched.scheduleAt(futureAtMs(input), () => { return; });
    assert.strictEqual(task.id, expected.id);
    sched.cancelAll();
  },

  'onMiss-past-scheduleAt': ({ expected, input }): void => {
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
    const pastMs = Date.now() + numberField(input, 'pastMsOffset');
    const task = sched.scheduleAt(pastMs, () => { return; });
    assert.strictEqual(sched.missIds.length, expected.missCount);
    assert.strictEqual(sched.missAtMs[0], pastMs);
    task.cancel();
    sched.cancelAll();
  },

  'onMiss-future-scheduleAt': ({ expected, input }): void => {
    class MissHookScheduler extends RealTimeScheduler {
      public missCount = 0;
      public constructor() { super(); }
      protected override onMiss(_id: string, _atMs: number, _nowMs: number): void {
        this.missCount++;
      }
    }
    const sched = new MissHookScheduler();
    const task = sched.scheduleAt(Date.now() + numberField(input, 'futureMsOffset'), () => { return; });
    assert.strictEqual(sched.missCount, expected.missCount);
    task.cancel();
    sched.cancelAll();
  },

  'onFireError-sync': ({ expected, input }): Promise<void> => {
    class FireErrorHookScheduler extends RealTimeScheduler {
      public fireErrorCount = 0;
      public constructor() { super(); }
      protected override onFireError(_id: string, _error: Error): void {
        this.fireErrorCount++;
      }
    }
    const sched = new FireErrorHookScheduler();
    sched.scheduleAt(Date.now() + numberField(input, 'pastMsOffset'), () => { throw new Error('sync throw'); });
    return setTimeoutPromise(numberField(input, 'waitMs')).then(() => {
      assert.strictEqual(sched.fireErrorCount, expected.fireErrorCount);
      sched.cancelAll();
    });
  },

  'onFireError-async': ({ expected, input }): Promise<void> => {
    class FireErrorHookScheduler extends RealTimeScheduler {
      public fireErrorCount = 0;
      public constructor() { super(); }
      protected override onFireError(_id: string, _error: Error): void {
        this.fireErrorCount++;
      }
    }
    const sched = new FireErrorHookScheduler();
    sched.scheduleAt(Date.now() + numberField(input, 'pastMsOffset'), async () => { throw new Error('async reject'); });
    return setTimeoutPromise(numberField(input, 'waitMs')).then(() => {
      assert.strictEqual(sched.fireErrorCount, expected.fireErrorCount);
      sched.cancelAll();
    });
  },

  'onIdle-after-cancelAll': ({ expected, input }): void => {
    class IdleHookScheduler extends RealTimeScheduler {
      public idleCount = 0;
      public constructor() { super(); }
      protected override onIdle(): void {
        this.idleCount++;
      }
    }
    const sched = new IdleHookScheduler();
    sched.scheduleAt(futureAtMs(input), () => { return; });
    sched.cancelAll();
    assert.strictEqual(sched.idleCount, expected.idleCount);
  },

  'onIdle-empty-cancelAll': ({ batch, expected }): void => {
    class IdleHookScheduler extends RealTimeScheduler {
      public idleCount = 0;
      public constructor() { super(); }
      protected override onIdle(): void {
        this.idleCount++;
      }
    }
    const sched = new IdleHookScheduler();
    assert.strictEqual(numberField(batch, 'idleCount'), expected.idleCount);
    sched.cancelAll();
    assert.strictEqual(sched.idleCount, expected.idleCount);
  },

  'chained-timeout-fire': ({ batch, expected, input }): void => {
    const maxDelayMs = numberField(input, 'maxDelayMs');
    const stageCount = numberField(batch, 'chainStageCount');

    class TinyMaxDelayScheduler extends RealTimeScheduler {
      public fireCount = 0;
      public scheduleCount = 0;
      public constructor() { super(); }
      protected override get maximumTimeoutDelayMs(): number {
        return maxDelayMs;
      }
      protected override onFire(_id: string): void {
        this.fireCount++;
      }
      protected override onSchedule(_id: string, _atMs: number, _variant: 'interval' | 'timeout'): void {
        this.scheduleCount++;
      }
    }

    // Drives the multi-stage chain deterministically: mocks Date.now() and setTimeout
    // so each stage advances by exactly maxDelayMs, with no reliance on wall-clock margins.
    mock.timers.enable({ apis: ['Date', 'setTimeout'] });
    try {
      const sched = new TinyMaxDelayScheduler();
      const atMs = Date.now() + (maxDelayMs * stageCount);
      let fired = false;
      const task = sched.scheduleAt(atMs, () => { fired = true; });

      for (let stage = 0; stage < stageCount; stage++) {
        mock.timers.tick(maxDelayMs);
      }

      assert.strictEqual(fired, expected.completed);
      assert.strictEqual(sched.fireCount, 1);
      assert.strictEqual(sched.scheduleCount, 1);
      assert.strictEqual(task.atMs, atMs);
      sched.cancelAll();
    } finally {
      mock.timers.reset();
    }
  },

  'chained-timeout-cancel': ({ batch, expected, input }): void => {
    const maxDelayMs = numberField(input, 'maxDelayMs');
    const stageCount = numberField(batch, 'chainStageCount');

    class TinyMaxDelayScheduler extends RealTimeScheduler {
      public fireCount = 0;
      public constructor() { super(); }
      protected override get maximumTimeoutDelayMs(): number {
        return maxDelayMs;
      }
      protected override onFire(_id: string): void {
        this.fireCount++;
      }
    }

    // Cancels mid-first-stage, then drives the rest of the chain's virtual time to
    // completion deterministically, proving cancellation holds across the whole chain.
    mock.timers.enable({ apis: ['Date', 'setTimeout'] });
    try {
      const sched = new TinyMaxDelayScheduler();
      const atMs = Date.now() + (maxDelayMs * stageCount);
      let fired = false;
      const task = sched.scheduleAt(atMs, () => { fired = true; });

      mock.timers.tick(maxDelayMs / 2);
      task.cancel();
      mock.timers.tick((maxDelayMs * stageCount) - (maxDelayMs / 2));

      assert.strictEqual(fired, false);
      assert.strictEqual(sched.fireCount, 0);
      assert.strictEqual(!fired && sched.fireCount === 0, expected.completed);
    } finally {
      mock.timers.reset();
    }
  },

  'async-onFire-rejection-guarded': ({ expected, input }): Promise<void> => {
    const recordedHookNames: string[] = [];
    const recordedCauses: Error[] = [];

    class RecordingSwallowingInvoker extends HookInvoker {
      protected override onHookError(hookName: string, cause: Error): void {
        recordedHookNames.push(hookName);
        recordedCauses.push(cause);
      }
    }

    const rejectionError = new Error('async onFire rejection');

    class AsyncRejectingFireScheduler extends RealTimeScheduler {
      protected override readonly hooks: HookInvoker = new RecordingSwallowingInvoker();
      public constructor() { super(); }
      protected override async onFire(_id: string): Promise<void> {
        await Promise.resolve();
        throw rejectionError;
      }
    }

    let rejectionEvents = 0;
    const onUnhandledRejection = (): void => {
      rejectionEvents++;
    };
    process.on('unhandledRejection', onUnhandledRejection);

    const sched = new AsyncRejectingFireScheduler();

    return (async () => {
      try {
        sched.scheduleAt(Date.now() + numberField(input, 'pastMsOffset'), () => { return; });
        await setTimeoutPromise(numberField(input, 'waitMs'));
        await new Promise((resolve) => { setImmediate(resolve); });
        await new Promise((resolve) => { setImmediate(resolve); });
        assert.strictEqual(rejectionEvents, Number(expected.unhandledRejections));
        assert.deepStrictEqual(recordedHookNames, ['onFire']);
        assert.strictEqual(recordedCauses[0], rejectionError);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
        sched.cancelAll();
      }
    })();
  },

  'onDrift-captured': ({ expected, input }): Promise<void> => {
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

    try {
      Date.now = (): number => {
        tick += numberField(input, 'clockStepMs');
        return tick;
      };

      const sched = new DriftScheduler();
      let fired = false;
      sched.scheduleAt(numberField(input, 'atMs'), () => { fired = true; });
      return setTimeoutPromise(numberField(input, 'waitMs')).then(() => {
        assert.strictEqual(fired, expected.completed);
        assert.strictEqual(sched.driftCount, 1);
        assert.ok(sched.driftMs[0] !== undefined && sched.driftMs[0] > 0);
        sched.cancelAll();
      });
    } finally {
      Date.now = originalNow;
    }
  },

  'scheduleEvery-sync-throw': ({ expected, input }): Promise<void> => {
    class FireErrorScheduler extends RealTimeScheduler {
      public fireErrorCount = 0;
      public constructor() { super(); }
      protected override onFireError(_id: string, _error: Error): void {
        this.fireErrorCount++;
      }
    }

    const sched = new FireErrorScheduler();
    const task = sched.scheduleEvery(numberField(input, 'intervalMs'), () => { throw new Error('interval sync throw'); });
    return setTimeoutPromise(numberField(input, 'waitMs')).then(() => {
      task.cancel();
      assert.strictEqual(sched.fireErrorCount > 0, expected.completed);
      sched.cancelAll();
    });
  },

  'scheduleEvery-async-reject': ({ expected, input }): Promise<void> => {
    class FireErrorScheduler extends RealTimeScheduler {
      public fireErrorCount = 0;
      public constructor() { super(); }
      protected override onFireError(_id: string, _error: Error): void {
        this.fireErrorCount++;
      }
    }

    const sched = new FireErrorScheduler();
    const task = sched.scheduleEvery(numberField(input, 'intervalMs'), async () => {
      await Promise.resolve();
      throw new Error('interval async reject');
    });
    return setTimeoutPromise(numberField(input, 'waitMs')).then(() => {
      task.cancel();
      assert.strictEqual(sched.fireErrorCount > 0, expected.completed);
      sched.cancelAll();
    });
  }
} satisfies Record<string, ScenarioRunner>;

type ScenarioShape = keyof typeof scenarioRunners;

function isScenarioShape(shape: string): shape is ScenarioShape {
  return Object.hasOwn(scenarioRunners, shape);
}

function scenarioRunner(shape: string): ScenarioRunner {
  assert.ok(isScenarioShape(shape), `Unknown RealTimeScheduler scenario shape: ${shape}`);
  return scenarioRunners[shape];
}

function runCase(scenarioCase: ScenarioCase): Promise<void> | void {
  const input = scenarioCase.input.scheduler;
  const batch = scenarioCase.input.batch ?? {};
  const expected = scenarioCase.expected;

  return scenarioRunner(scenarioCase.shape)({ batch, expected, input });
}

void describe('RealTimeScheduler', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
