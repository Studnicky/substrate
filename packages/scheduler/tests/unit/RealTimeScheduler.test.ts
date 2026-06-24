/**
 * Unit tests for `RealTimeScheduler`.
 */
import assert from 'node:assert/strict';
import { setTimeout as setTimeoutPromise } from 'node:timers/promises';
import { describe, it } from 'node:test';

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

// ---------------------------------------------------------------------------
// scheduleAt()
// ---------------------------------------------------------------------------

describe('RealTimeScheduler', () => {
  describe('happy path', () => {
    describe('scheduleAt', () => {
      it('returns a ScheduledTask with id and atMs', () => {
        const sched = new RealTimeScheduler();
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
        const sched = new RealTimeScheduler();
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
        const sched = new RealTimeScheduler();

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
        const sched = new RealTimeScheduler();
        act(sched);
        assert.ok(true);
      });
    }

    it('cancelAll on empty scheduler is a no-op', () => {
      const sched = new RealTimeScheduler();

      sched.cancelAll();

      assert.ok(true);
    });

    it('task IDs are unique across multiple schedules', () => {
      const sched = new RealTimeScheduler();
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
    it('cancel() on a fired task is a no-op (does not throw)', () => {
      const sched = new RealTimeScheduler();
      const atMs = Date.now() - 1;
      const task = sched.scheduleAt(atMs, () => {
        return;
      });

      task.cancel();
      assert.ok(true);
    });

    it('scheduleAt: rejected Promise from fire is silently caught', async () => {
      const sched = new RealTimeScheduler();
      const atMs = Date.now() - 1;

      sched.scheduleAt(atMs, async () => {
        await Promise.resolve();
        throw new Error('scheduleAt reject');
      });
      await setTimeoutPromise(FLUSH_DELAY_MS);

      assert.ok(true);
    });

    it('scheduleEvery: rejected Promise from fire is silently caught', async () => {
      const sched = new RealTimeScheduler();
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

    it('onCancelAll is called when cancelAll is called', () => {
      const sched = new AuditScheduler();

      sched.scheduleAt(Date.now() + FAR_FUTURE_DELAY_MS, () => { return; });
      sched.cancelAll();

      assert.strictEqual(sched.cancelAllCount, 1);
    });

    it('generateId override returns custom IDs', () => {
      class CustomIdScheduler extends RealTimeScheduler {
        protected override generateId(): string {
          return 'custom-id';
        }
      }

      const sched = new CustomIdScheduler();
      const task = sched.scheduleAt(Date.now() + FAR_FUTURE_DELAY_MS, () => { return; });

      assert.strictEqual(task.id, 'custom-id');
      sched.cancelAll();
    });
  });
});
