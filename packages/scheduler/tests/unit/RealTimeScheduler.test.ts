/**
 * Unit tests for `RealTimeScheduler`.
 */
import assert from 'node:assert/strict';
import { setTimeout as setTimeoutPromise } from 'node:timers/promises';
import { describe, it } from 'node:test';

import { HookInvocationError, HookInvoker } from '@studnicky/errors';

import { RealTimeScheduler } from '../../src/scheduler/RealTimeScheduler.js';

// ---------------------------------------------------------------------------
// Named constants for test values.
// ---------------------------------------------------------------------------

/** Far-future delay in ms so tasks never actually fire during tests. */
const FAR_FUTURE_DELAY_MS = 10_000;

/** Interval for recurring task tests. */
const INTERVAL_MS = 5_000;

/** Number of tasks to create in multi-task tests. */
const TASK_COUNT = 5;

/** Short delay to allow a past-due timer to fire in the event loop. */
const FLUSH_DELAY_MS = 20;

/** Overridden `maxTimeoutDelayMs` used to exercise the chained-timeout path without waiting ~24.8 days. */
const TINY_MAX_DELAY_MS = 10;

/** Number of chained stages to force in the far-future scheduleAt tests. */
const CHAIN_STAGE_COUNT = 3;

/** Extra buffer added on top of the total chained delay when awaiting a real fire. */
const CHAIN_FLUSH_BUFFER_MS = 30;

// ---------------------------------------------------------------------------
// scheduleAt()
// ---------------------------------------------------------------------------

describe('RealTimeScheduler', () => {
  describe('happy path', () => {
    describe('scheduleAt', () => {
      it('returns a ScheduledTask with id and atMs', () => {
        const sched = RealTimeScheduler.create();
        const atMs = Date.now() + FAR_FUTURE_DELAY_MS;
        const task = sched.scheduleAt(atMs, () => {
          return;
        });

        assert.strictEqual(task.atMs, atMs);
        assert.ok(task.id.length > 0, 'task.id must be non-empty');
        task.cancel();
        sched.cancelAll();
      });
    });

    describe('scheduleEvery', () => {
      it('returns a ScheduledTask with atMs and id', () => {
        const sched = RealTimeScheduler.create();
        const task = sched.scheduleEvery(INTERVAL_MS, () => {
          return;
        });

        assert.ok(task.atMs > 0);
        assert.ok(task.id.length > 0, 'task.id must be non-empty');
        task.cancel();
        sched.cancelAll();
      });
    });

    describe('cancelAll', () => {
      it('clears multiple tasks without error', () => {
        const sched = RealTimeScheduler.create();

        for (let index = 0; index < 3; index++) {
          sched.scheduleAt(Date.now() + FAR_FUTURE_DELAY_MS, () => {
            return;
          });
        }
        sched.cancelAll();

        assert.ok(true);
      });
    });
  });

  describe('edge cases', () => {
    const cancelNoErrorScenarios: Array<{
      description: string;
      act: (sched: RealTimeScheduler) => void;
    }> = [
      {
        description: 'cancel() before fire prevents double-cancel error',
        act: (sched) => {
          const task = sched.scheduleAt(Date.now() + FAR_FUTURE_DELAY_MS, () => { return; });
          task.cancel();
          task.cancel();
          sched.cancelAll();
        },
      },
      {
        description: 'scheduleEvery interval task cancel via cancelAll',
        act: (sched) => {
          sched.scheduleEvery(INTERVAL_MS, () => { return; });
          sched.cancelAll();
        },
      },
    ];
    for (const { description, act } of cancelNoErrorScenarios) {
      it(description, () => {
        const sched = RealTimeScheduler.create();
        act(sched);
        assert.ok(true);
      });
    }

    it('cancelAll on empty scheduler is a no-op', () => {
      const sched = RealTimeScheduler.create();

      sched.cancelAll();

      assert.ok(true);
    });

    it('task IDs are unique across multiple schedules', () => {
      const sched = RealTimeScheduler.create();
      const idSet = new Set<string>();

      for (let index = 0; index < TASK_COUNT; index++) {
        const task = sched.scheduleAt(Date.now() + FAR_FUTURE_DELAY_MS, () => {
          return;
        });

        idSet.add(task.id);
      }
      sched.cancelAll();

      assert.strictEqual(idSet.size, TASK_COUNT);
    });
  });

  describe('unhappy path', () => {
    it('scheduleAt: rejected Promise from fire is silently caught', async () => {
      const sched = RealTimeScheduler.create();
      const atMs = Date.now() - 1;

      sched.scheduleAt(atMs, async () => {
        await Promise.resolve();
        throw new Error('scheduleAt reject');
      });
      await setTimeoutPromise(FLUSH_DELAY_MS);

      assert.ok(true);
    });

    it('scheduleEvery: rejected Promise from fire is silently caught', async () => {
      const sched = RealTimeScheduler.create();
      const task = sched.scheduleEvery(1, async () => {
        await Promise.resolve();
        throw new Error('scheduleEvery reject');
      });

      await setTimeoutPromise(FLUSH_DELAY_MS);
      task.cancel();
      sched.cancelAll();

      assert.ok(true);
    });
  });

  // -------------------------------------------------------------------------
  // Subclass extension seams
  // -------------------------------------------------------------------------

  describe('subclass extension seams', () => {
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

    const onScheduleScenarios: Array<{
      description: string;
      act: (sched: AuditScheduler) => void;
    }> = [
      {
        description: 'onSchedule is called when scheduleAt is called',
        act: (sched) => {
          sched.scheduleAt(Date.now() + FAR_FUTURE_DELAY_MS, () => { return; });
          sched.cancelAll();
        },
      },
      {
        description: 'onSchedule is called when scheduleEvery is called',
        act: (sched) => {
          sched.scheduleEvery(INTERVAL_MS, () => { return; });
          sched.cancelAll();
        },
      },
    ];
    for (const { description, act } of onScheduleScenarios) {
      it(description, () => {
        const sched = new AuditScheduler();
        act(sched);
        assert.strictEqual(sched.scheduleCount, 1);
      });
    }

    it('onCancel is called when task is cancelled', () => {
      const sched = new AuditScheduler();
      const task = sched.scheduleAt(Date.now() + FAR_FUTURE_DELAY_MS, () => { return; });

      task.cancel();

      assert.strictEqual(sched.cancelCount, 1);
      sched.cancelAll();
    });

    it('cancel after a timeout callback fires does not invoke onCancel', async () => {
      const sched = new AuditScheduler();
      let callbackCount = 0;
      const task = sched.scheduleAt(Date.now() - 1, () => { callbackCount++; });

      await setTimeoutPromise(FLUSH_DELAY_MS);
      task.cancel();
      task.cancel();

      assert.strictEqual(callbackCount, 1);
      assert.strictEqual(sched.fireCount, 1);
      assert.strictEqual(sched.cancelCount, 0);
      sched.cancelAll();
    });

    it('onCancelAll is called when cancelAll is called', () => {
      const sched = new AuditScheduler();

      sched.scheduleAt(Date.now() + FAR_FUTURE_DELAY_MS, () => { return; });
      sched.cancelAll();

      assert.strictEqual(sched.cancelAllCount, 1);
    });

    it('generateId override returns custom IDs', () => {
      class CustomIdScheduler extends RealTimeScheduler {
        public constructor() { super(); }
        protected override generateId(): string {
          return 'custom-id';
        }
      }

      const sched = new CustomIdScheduler();
      const task = sched.scheduleAt(Date.now() + FAR_FUTURE_DELAY_MS, () => { return; });

      assert.strictEqual(task.id, 'custom-id');
      sched.cancelAll();
    });

    // -------------------------------------------------------------------------
    // New hooks: onFireError, onDrift, onMiss, onIdle
    // -------------------------------------------------------------------------

    it('onMiss fires when scheduleAt receives a past atMs', () => {
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
      const pastMs = Date.now() - 1;
      const task = sched.scheduleAt(pastMs, () => { return; });

      assert.strictEqual(sched.missIds.length, 1);
      assert.strictEqual(sched.missAtMs[0], pastMs);
      task.cancel();
      sched.cancelAll();
    });

    it('onMiss does NOT fire for a future scheduleAt', () => {
      class MissHookScheduler extends RealTimeScheduler {
        public missCount = 0;
        public constructor() { super(); }
        protected override onMiss(_id: string, _atMs: number, _nowMs: number): void {
          this.missCount++;
        }
      }

      const sched = new MissHookScheduler();
      const task = sched.scheduleAt(Date.now() + FAR_FUTURE_DELAY_MS, () => { return; });

      assert.strictEqual(sched.missCount, 0);
      task.cancel();
      sched.cancelAll();
    });

    it('onFireError fires when a scheduled task throws synchronously', async () => {
      class FireErrorHookScheduler extends RealTimeScheduler {
        public fireErrorCount = 0;
        public constructor() { super(); }
        protected override onFireError(_id: string, _error: unknown): void {
          this.fireErrorCount++;
        }
      }

      const sched = new FireErrorHookScheduler();
      // Schedule in the past so it fires at next event-loop turn
      sched.scheduleAt(Date.now() - 1, () => { throw new Error('sync throw'); });

      await setTimeoutPromise(FLUSH_DELAY_MS);

      assert.strictEqual(sched.fireErrorCount, 1);
      sched.cancelAll();
    });

    it('onFireError fires when a scheduled task rejects asynchronously', async () => {
      class FireErrorHookScheduler extends RealTimeScheduler {
        public fireErrorCount = 0;
        public constructor() { super(); }
        protected override onFireError(_id: string, _error: unknown): void {
          this.fireErrorCount++;
        }
      }

      const sched = new FireErrorHookScheduler();
      sched.scheduleAt(Date.now() - 1, async () => { throw new Error('async reject'); });

      await setTimeoutPromise(FLUSH_DELAY_MS);

      assert.strictEqual(sched.fireErrorCount, 1);
      sched.cancelAll();
    });

    it('onIdle fires after cancelAll clears all tasks', () => {
      class IdleHookScheduler extends RealTimeScheduler {
        public idleCount = 0;
        public constructor() { super(); }
        protected override onIdle(): void {
          this.idleCount++;
        }
      }

      const sched = new IdleHookScheduler();
      sched.scheduleAt(Date.now() + FAR_FUTURE_DELAY_MS, () => { return; });
      sched.cancelAll();

      assert.strictEqual(sched.idleCount, 1);
    });

    it('onIdle fires on cancelAll even when no tasks were scheduled', () => {
      class IdleHookScheduler extends RealTimeScheduler {
        public idleCount = 0;
        public constructor() { super(); }
        protected override onIdle(): void {
          this.idleCount++;
        }
      }

      const sched = new IdleHookScheduler();
      sched.cancelAll();

      assert.strictEqual(sched.idleCount, 1);
    });

    it('a throwing onSchedule hook does not replace task registration', () => {
      class ThrowingScheduleScheduler extends RealTimeScheduler {
        public constructor() { super(); }
        protected override onSchedule(): void {
          throw new Error('onSchedule boom');
        }
      }

      const sched = new ThrowingScheduleScheduler();
      const task = sched.scheduleAt(Date.now() + FAR_FUTURE_DELAY_MS, () => { return; });

      assert.ok(task.id.length > 0);
      task.cancel();
      sched.cancelAll();
    });

    it('a throwing onCancel hook does not replace cancellation', () => {
      class ThrowingCancelScheduler extends RealTimeScheduler {
        public constructor() { super(); }
        protected override onCancel(): void {
          throw new Error('onCancel boom');
        }
      }

      const sched = new ThrowingCancelScheduler();
      const task = sched.scheduleAt(Date.now() + FAR_FUTURE_DELAY_MS, () => { return; });

      assert.doesNotThrow(() => {
        task.cancel();
      });
      sched.cancelAll();
    });

    it('a throwing onFire hook does not replace task execution', async () => {
      class ThrowingFireScheduler extends RealTimeScheduler {
        public constructor() { super(); }
        protected override onFire(): void {
          throw new Error('onFire boom');
        }
      }

      const sched = new ThrowingFireScheduler();
      let fired = false;

      sched.scheduleAt(Date.now() - 1, () => {
        fired = true;
      });
      await setTimeoutPromise(FLUSH_DELAY_MS);

      assert.strictEqual(fired, true);
    });

    it('a throwing onFire hook is wrapped in a HookInvocationError and passed to onHookError', async () => {
      let receivedError: HookInvocationError | undefined;

      class RecordingHookInvoker extends HookInvoker {
        protected override onHookError(hookName: string, cause: unknown): void {
          receivedError = new HookInvocationError(hookName, cause);
        }
      }

      class ObservedThrowingFireScheduler extends RealTimeScheduler {
        protected override readonly hooks: HookInvoker = new RecordingHookInvoker();
        public constructor() { super(); }
        protected override onFire(): void {
          throw new Error('onFire boom');
        }
      }

      const sched = new ObservedThrowingFireScheduler();

      sched.scheduleAt(Date.now() - 1, () => { return; });
      await setTimeoutPromise(FLUSH_DELAY_MS);

      assert.ok(receivedError instanceof HookInvocationError);
      assert.strictEqual(receivedError.hookName, 'onFire');
      assert.ok(receivedError.cause instanceof Error);
      assert.strictEqual(receivedError.cause.message, 'onFire boom');
      sched.cancelAll();
    });

    it('a throwing onFireError hook does not replace swallowed task failure', async () => {
      class ThrowingFireErrorScheduler extends RealTimeScheduler {
        public constructor() { super(); }
        protected override onFireError(): void {
          throw new Error('onFireError boom');
        }
      }

      const sched = new ThrowingFireErrorScheduler();
      sched.scheduleAt(Date.now() - 1, () => { throw new Error('task boom'); });

      await setTimeoutPromise(FLUSH_DELAY_MS);

      assert.ok(true);
    });

    // -------------------------------------------------------------------------
    // scheduleAt: chained timeout for delays beyond maxTimeoutDelayMs
    // -------------------------------------------------------------------------

    /** Subclass with a tiny `maxTimeoutDelayMs` so chained stages resolve without real 24+ day waits. */
    class TinyMaxDelayScheduler extends RealTimeScheduler {
      public fireCount = 0;
      public scheduleCount = 0;

      public constructor() { super(); }

      protected override get maxTimeoutDelayMs(): number {
        return TINY_MAX_DELAY_MS;
      }

      protected override onFire(_id: string): void {
        this.fireCount++;
      }

      protected override onSchedule(_id: string, _atMs: number, _variant: 'interval' | 'timeout'): void {
        this.scheduleCount++;
      }
    }

    it('scheduleAt chains through intermediate stages and still fires once for a far-future atMs', async () => {
      const sched = new TinyMaxDelayScheduler();
      const atMs = Date.now() + (TINY_MAX_DELAY_MS * CHAIN_STAGE_COUNT);
      let fired = false;
      const task = sched.scheduleAt(atMs, () => {
        fired = true;
      });

      await setTimeoutPromise((TINY_MAX_DELAY_MS * CHAIN_STAGE_COUNT) + CHAIN_FLUSH_BUFFER_MS);

      assert.strictEqual(fired, true);
      assert.strictEqual(sched.fireCount, 1);
      assert.strictEqual(sched.scheduleCount, 1);
      assert.strictEqual(task.atMs, atMs);
      sched.cancelAll();
    });

    it('cancel() during an intermediate chained stage prevents the eventual fire', async () => {
      const sched = new TinyMaxDelayScheduler();
      const atMs = Date.now() + (TINY_MAX_DELAY_MS * CHAIN_STAGE_COUNT);
      let fired = false;
      const task = sched.scheduleAt(atMs, () => {
        fired = true;
      });

      // Cancel partway through the chain — before the terminal stage arms.
      await setTimeoutPromise(TINY_MAX_DELAY_MS / 2);
      task.cancel();

      await setTimeoutPromise((TINY_MAX_DELAY_MS * CHAIN_STAGE_COUNT) + CHAIN_FLUSH_BUFFER_MS);

      assert.strictEqual(fired, false);
      assert.strictEqual(sched.fireCount, 0);
    });

    // -------------------------------------------------------------------------
    // Regression: async hook override rejection must never become an
    // unhandled rejection — `hooks.invoke` call sites must return the
    // hook's result so HookInvoker actually sees the thenable.
    // -------------------------------------------------------------------------

    it('an async onFire override that rejects is routed to onHookError without an unhandled rejection', async () => {
      const recordedHookNames: string[] = [];
      const recordedCauses: unknown[] = [];

      class RecordingSwallowingInvoker extends HookInvoker {
        protected override onHookError(hookName: string, cause: unknown): void {
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

      const rejectionEvents: unknown[] = [];
      const onUnhandledRejection = (reason: unknown): void => {
        rejectionEvents.push(reason);
      };
      process.on('unhandledRejection', onUnhandledRejection);

      const sched = new AsyncRejectingFireScheduler();

      try {
        sched.scheduleAt(Date.now() - 1, () => { return; });

        await setTimeoutPromise(FLUSH_DELAY_MS);
        await new Promise((resolve) => { setImmediate(resolve); });
        await new Promise((resolve) => { setImmediate(resolve); });

        assert.strictEqual(rejectionEvents.length, 0);
        assert.deepStrictEqual(recordedHookNames, ['onFire']);
        assert.strictEqual(recordedCauses[0], rejectionError);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
        sched.cancelAll();
      }
    });
  });
});
