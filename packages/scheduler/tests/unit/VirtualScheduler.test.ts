/**
 * Unit tests for `VirtualScheduler`.
 * Requires `@studnicky/clock` — `VirtualTimeCounter` and `VirtualClockProvider`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock';

import { VirtualScheduler } from '../../src/scheduler/VirtualScheduler.js';
import { MinimumHeap } from '../../src/scheduler/MinimumHeap.js';

// ---------------------------------------------------------------------------
// Named constants for test values.
// ---------------------------------------------------------------------------

/** Advance that passes the scheduled task. */
const ADVANCE_PASS = 100;

/** Advance that falls short of the scheduled task. */
const ADVANCE_SHORT = 30;

/** Task scheduled at offset 50 ms. */
const TASK_OFFSET_50 = 50;

/** Start time for counter with offset: 100 ms. */
const START_100 = 100;

/** Advance for 50 ms. */
const ADVANCE_50 = 50;

/** Expected nowMs after start=100 + advance=50. */
const EXPECTED_150 = 150;

/** Advance for 200 ms. */
const ADVANCE_200 = 200;

/** Expected nowMs after advance(100)+advance(200). */
const EXPECTED_300 = 300;

/** Negative advance value. */
const NEGATIVE_ADVANCE = -10;

/** Negative start value. */
const NEGATIVE_START = -50;

/** Advance for multi-fire tests. */
const ADVANCE_MULTI = 300;

/** Interval for multi-fire tests. */
const INTERVAL_100 = 100;

/** Expected fire count with interval=100 over 300 ms. */
const EXPECTED_FIRES_3 = 3;

/** Task at 15 ms — used for minimum-heap right-child smaller-than-left scenario. */
const TASK_AT_15 = 15;

/** Task at 20 ms — used for minimum-heap siftDown left-child scenario. */
const TASK_AT_20 = 20;

/** Task at 25 ms — used for minimum-heap right-child smaller-than-left scenario. */
const TASK_AT_25 = 25;

/** Accumulated delta for 3 advances test. */
const DELTA_A = 20;

/** Accumulated delta B. */
const DELTA_B = 30;

/** Expected sum of deltas. */
const DELTA_SUM = 70;

// ---------------------------------------------------------------------------
// Helper classes
// ---------------------------------------------------------------------------

/** Tracks how many times `record()` was called. */
class FireRecord {
  public count = 0;

  /** Records a single fire event. */
  public record(): void {
    this.count++;
  }
}

// ---------------------------------------------------------------------------
// VirtualTimeCounter tests
// ---------------------------------------------------------------------------

describe('VirtualTimeCounter', () => {
  describe('happy path', () => {
    it('zero start, no advances → 0', () => {
      const counter = new VirtualTimeCounter(0);

      assert.strictEqual(counter.nowMs(), 0);
    });

    it('advance 100ms → 100', () => {
      const counter = new VirtualTimeCounter(0);

      counter.advance(ADVANCE_PASS);

      assert.strictEqual(counter.nowMs(), ADVANCE_PASS);
    });

    it('two advances sum to 300', () => {
      const counter = new VirtualTimeCounter(0);

      counter.advance(ADVANCE_PASS);
      counter.advance(ADVANCE_200);

      assert.strictEqual(counter.nowMs(), EXPECTED_300);
    });

    it('start at 100 + advance 50 → 150', () => {
      const counter = new VirtualTimeCounter(START_100);

      counter.advance(ADVANCE_50);

      assert.strictEqual(counter.nowMs(), EXPECTED_150);
    });
  });

  describe('edge cases', () => {
    it('negative advance is ignored → stays at 0', () => {
      const counter = new VirtualTimeCounter(0);

      counter.advance(NEGATIVE_ADVANCE);

      assert.strictEqual(counter.nowMs(), 0);
    });

    it('zero advance is no-op → stays at 0', () => {
      const counter = new VirtualTimeCounter(0);

      counter.advance(0);

      assert.strictEqual(counter.nowMs(), 0);
    });

    it('negative start clamped to 0', () => {
      const counter = new VirtualTimeCounter(NEGATIVE_START);

      assert.strictEqual(counter.nowMs(), 0);
    });
  });

  describe('unhappy path', () => {
    it('multiple advances accumulate correctly', () => {
      const counter = new VirtualTimeCounter(0);

      counter.advance(DELTA_A);
      counter.advance(DELTA_B);
      counter.advance(DELTA_A);

      assert.strictEqual(counter.nowMs(), DELTA_SUM);
    });
  });
});

// ---------------------------------------------------------------------------
// VirtualScheduler tests
// ---------------------------------------------------------------------------

describe('VirtualScheduler', () => {
  describe('happy path', () => {
    describe('scheduleAt', () => {
      it('task fires when advance passes atMs', () => {
        const counter = new VirtualTimeCounter(0);
        const sched = new VirtualScheduler(counter);
        let fired = false;
        const atMs = TASK_OFFSET_50;
        const task = sched.scheduleAt(atMs, () => {
          fired = true;
        });

        sched.advance(ADVANCE_PASS);

        assert.strictEqual(fired, true);
        assert.strictEqual(task.atMs, atMs);
        assert.ok(task.id.length > 0, 'task.id must be non-empty');
      });

      it('task does not fire when advance falls short of atMs', () => {
        const counter = new VirtualTimeCounter(0);
        const sched = new VirtualScheduler(counter);
        let fired = false;
        const atMs = TASK_OFFSET_50;
        const task = sched.scheduleAt(atMs, () => {
          fired = true;
        });

        sched.advance(ADVANCE_SHORT);

        assert.strictEqual(fired, false);
        assert.strictEqual(task.atMs, atMs);
        assert.ok(task.id.length > 0, 'task.id must be non-empty');
      });
    });

    describe('scheduleEvery', () => {
      it('fires 3 times for advance=300 with interval=100', () => {
        const counter = new VirtualTimeCounter(0);
        const sched = new VirtualScheduler(counter);
        let fireCount = 0;

        sched.scheduleEvery(INTERVAL_100, () => {
          fireCount++;
        });
        sched.advance(ADVANCE_MULTI);

        assert.strictEqual(fireCount, EXPECTED_FIRES_3);
      });

      it('fires once for advance equal to interval', () => {
        const counter = new VirtualTimeCounter(0);
        const sched = new VirtualScheduler(counter);
        let fireCount = 0;

        sched.scheduleEvery(INTERVAL_100, () => {
          fireCount++;
        });
        sched.advance(INTERVAL_100);

        assert.strictEqual(fireCount, 1);
      });

      it('does not fire when advance less than interval', () => {
        const counter = new VirtualTimeCounter(0);
        const sched = new VirtualScheduler(counter);
        let fireCount = 0;

        sched.scheduleEvery(INTERVAL_100, () => {
          fireCount++;
        });
        sched.advance(ADVANCE_50);

        assert.strictEqual(fireCount, 0);
      });
    });

    describe('cancelAll', () => {
      it('cancelAll prevents all pending tasks from firing', () => {
        const counter = new VirtualTimeCounter(0);
        const sched = new VirtualScheduler(counter);
        const rec = new FireRecord();

        for (let index = 0; index < EXPECTED_FIRES_3; index++) {
          sched.scheduleAt(TASK_OFFSET_50, () => {
            rec.record();
          });
        }
        sched.cancelAll();
        sched.advance(ADVANCE_PASS);

        assert.strictEqual(rec.count, 0);
      });

      it('cancelAll on empty scheduler is a no-op', () => {
        const counter = new VirtualTimeCounter(0);
        const sched = new VirtualScheduler(counter);

        sched.cancelAll();
        sched.advance(ADVANCE_PASS);

        assert.ok(true);
      });
    });

    describe('runAll', () => {
      it('runAll fires all 3 pending tasks', () => {
        const counter = new VirtualTimeCounter(0);
        const sched = new VirtualScheduler(counter);
        const rec = new FireRecord();

        for (let index = 0; index < EXPECTED_FIRES_3; index++) {
          sched.scheduleAt((index + 1) * ADVANCE_50, () => {
            rec.record();
          });
        }
        sched.runAll();

        assert.strictEqual(rec.count, EXPECTED_FIRES_3);
      });
    });
  });

  describe('edge cases', () => {
    it('cancelled task does not fire even when advance passes atMs', () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new VirtualScheduler(counter);
      let fired = false;
      const atMs = TASK_OFFSET_50;
      const task = sched.scheduleAt(atMs, () => {
        fired = true;
      });

      task.cancel();
      sched.advance(ADVANCE_PASS);

      assert.strictEqual(fired, false);
      assert.strictEqual(task.atMs, atMs);
      assert.ok(task.id.length > 0, 'task.id must be non-empty');
    });

    it('runAll on empty scheduler fires 0 tasks', () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new VirtualScheduler(counter);
      const rec = new FireRecord();

      sched.runAll();

      assert.strictEqual(rec.count, 0);
    });

    it('runAll skips the first cancelled task', () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new VirtualScheduler(counter);
      const rec = new FireRecord();
      const tasks: { readonly cancel: () => void }[] = [];

      for (let index = 0; index < EXPECTED_FIRES_3; index++) {
        const task = sched.scheduleAt((index + 1) * ADVANCE_50, () => {
          rec.record();
        });

        tasks.push(task);
      }

      const [first] = tasks;

      if (first !== undefined) {
        first.cancel();
      }
      sched.runAll();

      assert.strictEqual(rec.count, 2);
    });

    it('runAll with 4 tasks forces right-child-smaller siftDown path', () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new VirtualScheduler(counter);
      const rec = new FireRecord();
      const atMsValues = [10, TASK_AT_20, TASK_AT_15, TASK_AT_25];

      for (const atMs of atMsValues) {
        sched.scheduleAt(atMs, () => {
          rec.record();
        });
      }
      sched.runAll();

      assert.strictEqual(rec.count, 4);
    });

    it('runUntil only fires tasks at or before the specified time', () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new VirtualScheduler(counter);
      let aFired = false;
      let bFired = false;

      sched.scheduleAt(TASK_OFFSET_50, () => {
        aFired = true;
      });
      sched.scheduleAt(EXPECTED_150, () => {
        bFired = true;
      });
      sched.runUntil(ADVANCE_PASS);

      assert.strictEqual(aFired, true);
      assert.strictEqual(bFired, false);
    });

    it('interval tasks are rescheduled after each fire', () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new VirtualScheduler(counter);
      let count = 0;

      sched.scheduleEvery(ADVANCE_PASS, () => {
        count++;
      });
      sched.advance(ADVANCE_200 + ADVANCE_50);

      assert.strictEqual(count, 2);
    });

    it('cancelled interval task does not reschedule', () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new VirtualScheduler(counter);
      let count = 0;
      const task = sched.scheduleEvery(ADVANCE_PASS, () => {
        count++;
      });

      sched.advance(ADVANCE_PASS);
      task.cancel();
      sched.advance(ADVANCE_200);

      assert.strictEqual(count, 1);
    });
  });

  describe('unhappy path', () => {
    it('runAll on cancelled tasks fires zero tasks', () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new VirtualScheduler(counter);
      let fired = false;
      const task = sched.scheduleAt(TASK_OFFSET_50, () => {
        fired = true;
      });

      task.cancel();
      sched.runAll();

      assert.strictEqual(fired, false);
    });

    it('advance with 0 or negative delta does not advance counter', () => {
      const counter = new VirtualTimeCounter(ADVANCE_PASS);
      const sched = new VirtualScheduler(counter);
      let fired = false;

      sched.scheduleAt(EXPECTED_150, () => {
        fired = true;
      });
      sched.advance(0);
      sched.advance(NEGATIVE_ADVANCE);

      assert.strictEqual(fired, false);
      assert.strictEqual(counter.nowMs(), ADVANCE_PASS);
    });

    it('runUntil: rejected Promise from fire is silently caught', async () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new VirtualScheduler(counter);

      sched.scheduleAt(TASK_OFFSET_50, async () => {
        await Promise.resolve();
        throw new Error('runUntil-reject');
      });
      sched.advance(ADVANCE_PASS);

      await Promise.resolve();
      await Promise.resolve();

      assert.ok(true);
    });

    it('runAll: rejected Promise from fire is silently caught', async () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new VirtualScheduler(counter);

      sched.scheduleAt(TASK_OFFSET_50, async () => {
        await Promise.resolve();
        throw new Error('runAll-reject');
      });
      sched.runAll();

      await Promise.resolve();
      await Promise.resolve();

      assert.ok(true);
    });

    it('VirtualClockProvider.now clamps negative nowMs to 0', () => {
      const negCounter = {
        advance: (_delta: number): void => {
          return;
        },
        nowMs: (): number => {
          return -1;
        }
      };
      const provider = new VirtualClockProvider(negCounter);

      assert.strictEqual(provider.now(), 0);
    });
  });

  // -------------------------------------------------------------------------
  // Subclass extension seams
  // -------------------------------------------------------------------------

  describe('subclass extension seams', () => {
    class AuditVirtualScheduler extends VirtualScheduler {
      public scheduleCount = 0;
      public fireCount = 0;
      public cancelCount = 0;
      public cancelAllCount = 0;
      public advanceCount = 0;

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

      protected override onAdvance(_deltaMs: number): void {
        this.advanceCount++;
      }
    }

    it('onSchedule called on scheduleAt', () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new AuditVirtualScheduler(counter);

      sched.scheduleAt(TASK_OFFSET_50, () => { return; });

      assert.strictEqual(sched.scheduleCount, 1);
    });

    it('onFire called when task fires via advance', () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new AuditVirtualScheduler(counter);

      sched.scheduleAt(TASK_OFFSET_50, () => { return; });
      sched.advance(ADVANCE_PASS);

      assert.strictEqual(sched.fireCount, 1);
    });

    it('onCancel called when task cancel() is called', () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new AuditVirtualScheduler(counter);
      const task = sched.scheduleAt(TASK_OFFSET_50, () => { return; });

      task.cancel();

      assert.strictEqual(sched.cancelCount, 1);
    });

    it('onCancelAll called via cancelAll()', () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new AuditVirtualScheduler(counter);

      sched.scheduleAt(TASK_OFFSET_50, () => { return; });
      sched.cancelAll();

      assert.strictEqual(sched.cancelAllCount, 1);
    });

    it('onAdvance called on advance()', () => {
      const counter = new VirtualTimeCounter(0);
      const sched = new AuditVirtualScheduler(counter);

      sched.advance(ADVANCE_PASS);

      assert.strictEqual(sched.advanceCount, 1);
    });

    it('virtualCounter getter is accessible from subclass', () => {
      class CounterAccessor extends VirtualScheduler {
        public getCounter(): Readonly<VirtualTimeCounter> {
          return this.virtualCounter;
        }
      }

      const counter = new VirtualTimeCounter(0);
      const sched = new CounterAccessor(counter);

      assert.strictEqual(sched.getCounter().nowMs(), 0);
    });

    it('isCancelled accessible from subclass', () => {
      class CancelChecker extends VirtualScheduler {
        public checkCancelled(id: string): boolean {
          return this.isCancelled(id);
        }
      }

      const counter = new VirtualTimeCounter(0);
      const sched = new CancelChecker(counter);
      const task = sched.scheduleAt(TASK_OFFSET_50, () => { return; });

      task.cancel();

      assert.strictEqual(sched.checkCancelled(task.id), true);
    });

    it('createHeap override — subclass can substitute a custom heap', () => {
      let heapCreatedCount = 0;

      class SpyHeapScheduler extends VirtualScheduler {
        protected override createHeap(): MinimumHeap {
          heapCreatedCount++;
          return new MinimumHeap();
        }
      }

      const counter = new VirtualTimeCounter(0);
      const sched = new SpyHeapScheduler(counter);

      // createHeap is called during construction — verify it ran
      assert.strictEqual(heapCreatedCount, 1);
      // verify scheduler still works correctly with the overridden heap
      let fired = false;
      sched.scheduleAt(TASK_OFFSET_50, () => { fired = true; });
      sched.advance(ADVANCE_PASS);
      assert.strictEqual(fired, true);
    });
  });
});
