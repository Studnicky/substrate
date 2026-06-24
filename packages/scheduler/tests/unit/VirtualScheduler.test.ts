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
    const counterAdvanceScenarios: Array<{
      description: string;
      start: number;
      advances: number[];
      expectedNowMs: number;
    }> = [
      { description: 'zero start, no advances → 0', start: 0, advances: [], expectedNowMs: 0 },
      { description: 'advance 100ms → 100', start: 0, advances: [ADVANCE_PASS], expectedNowMs: ADVANCE_PASS },
      { description: 'two advances sum to 300', start: 0, advances: [ADVANCE_PASS, ADVANCE_200], expectedNowMs: EXPECTED_300 },
      { description: 'start at 100 + advance 50 → 150', start: START_100, advances: [ADVANCE_50], expectedNowMs: EXPECTED_150 },
    ];
    for (const { description, start, advances, expectedNowMs } of counterAdvanceScenarios) {
      it(description, () => {
        const counter = VirtualTimeCounter.create({ 'startMs': start });
        for (const delta of advances) { counter.advance(delta); }
        assert.strictEqual(counter.nowMs(), expectedNowMs);
      });
    }
  });

  describe('edge cases', () => {
    const counterEdgeCaseScenarios: Array<{
      description: string;
      start: number;
      advance: number;
      expectedNowMs: number;
    }> = [
      { description: 'negative advance is ignored → stays at 0', start: 0, advance: NEGATIVE_ADVANCE, expectedNowMs: 0 },
      { description: 'zero advance is no-op → stays at 0', start: 0, advance: 0, expectedNowMs: 0 },
    ];
    for (const { description, start, advance, expectedNowMs } of counterEdgeCaseScenarios) {
      it(description, () => {
        const counter = VirtualTimeCounter.create({ 'startMs': start });
        counter.advance(advance);
        assert.strictEqual(counter.nowMs(), expectedNowMs);
      });
    }

    it('negative startMs throws ClockError', () => {
      assert.throws(() => {
        VirtualTimeCounter.create({ 'startMs': NEGATIVE_START });
      });
    });
  });

  describe('unhappy path', () => {
    it('multiple advances accumulate correctly', () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });

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
        const counter = VirtualTimeCounter.create({ 'startMs': 0 });
        const sched = VirtualScheduler.create({ 'counter': counter });
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
        const counter = VirtualTimeCounter.create({ 'startMs': 0 });
        const sched = VirtualScheduler.create({ 'counter': counter });
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
        const counter = VirtualTimeCounter.create({ 'startMs': 0 });
        const sched = VirtualScheduler.create({ 'counter': counter });
        let fireCount = 0;

        sched.scheduleEvery(INTERVAL_100, () => {
          fireCount++;
        });
        sched.advance(ADVANCE_MULTI);

        assert.strictEqual(fireCount, EXPECTED_FIRES_3);
      });

      it('fires once for advance equal to interval', () => {
        const counter = VirtualTimeCounter.create({ 'startMs': 0 });
        const sched = VirtualScheduler.create({ 'counter': counter });
        let fireCount = 0;

        sched.scheduleEvery(INTERVAL_100, () => {
          fireCount++;
        });
        sched.advance(INTERVAL_100);

        assert.strictEqual(fireCount, 1);
      });

      it('does not fire when advance less than interval', () => {
        const counter = VirtualTimeCounter.create({ 'startMs': 0 });
        const sched = VirtualScheduler.create({ 'counter': counter });
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
        const counter = VirtualTimeCounter.create({ 'startMs': 0 });
        const sched = VirtualScheduler.create({ 'counter': counter });
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
        const counter = VirtualTimeCounter.create({ 'startMs': 0 });
        const sched = VirtualScheduler.create({ 'counter': counter });

        sched.cancelAll();
        sched.advance(ADVANCE_PASS);

        assert.ok(true);
      });
    });

    describe('runAll', () => {
      it('runAll fires all 3 pending tasks', () => {
        const counter = VirtualTimeCounter.create({ 'startMs': 0 });
        const sched = VirtualScheduler.create({ 'counter': counter });
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
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = VirtualScheduler.create({ 'counter': counter });
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
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = VirtualScheduler.create({ 'counter': counter });
      const rec = new FireRecord();

      sched.runAll();

      assert.strictEqual(rec.count, 0);
    });

    it('runAll skips the first cancelled task', () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = VirtualScheduler.create({ 'counter': counter });
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
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = VirtualScheduler.create({ 'counter': counter });
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
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = VirtualScheduler.create({ 'counter': counter });
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
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = VirtualScheduler.create({ 'counter': counter });
      let count = 0;

      sched.scheduleEvery(ADVANCE_PASS, () => {
        count++;
      });
      sched.advance(ADVANCE_200 + ADVANCE_50);

      assert.strictEqual(count, 2);
    });

    it('cancelled interval task does not reschedule', () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = VirtualScheduler.create({ 'counter': counter });
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
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = VirtualScheduler.create({ 'counter': counter });
      let fired = false;
      const task = sched.scheduleAt(TASK_OFFSET_50, () => {
        fired = true;
      });

      task.cancel();
      sched.runAll();

      assert.strictEqual(fired, false);
    });

    it('advance with 0 or negative delta does not advance counter', () => {
      const counter = VirtualTimeCounter.create({ 'startMs': ADVANCE_PASS });
      const sched = VirtualScheduler.create({ 'counter': counter });
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
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = VirtualScheduler.create({ 'counter': counter });

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
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = VirtualScheduler.create({ 'counter': counter });

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
      const provider = VirtualClockProvider.create(negCounter);

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

      public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }

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

    const auditHookScenarios: Array<{
      description: string;
      act: (sched: AuditVirtualScheduler) => void;
      getCount: (sched: AuditVirtualScheduler) => number;
    }> = [
      {
        description: 'onSchedule called on scheduleAt',
        act: (sched) => { sched.scheduleAt(TASK_OFFSET_50, () => { return; }); },
        getCount: (sched) => sched.scheduleCount,
      },
      {
        description: 'onFire called when task fires via advance',
        act: (sched) => { sched.scheduleAt(TASK_OFFSET_50, () => { return; }); sched.advance(ADVANCE_PASS); },
        getCount: (sched) => sched.fireCount,
      },
      {
        description: 'onCancel called when task cancel() is called',
        act: (sched) => { const task = sched.scheduleAt(TASK_OFFSET_50, () => { return; }); task.cancel(); },
        getCount: (sched) => sched.cancelCount,
      },
      {
        description: 'onCancelAll called via cancelAll()',
        act: (sched) => { sched.scheduleAt(TASK_OFFSET_50, () => { return; }); sched.cancelAll(); },
        getCount: (sched) => sched.cancelAllCount,
      },
      {
        description: 'onAdvance called on advance()',
        act: (sched) => { sched.advance(ADVANCE_PASS); },
        getCount: (sched) => sched.advanceCount,
      },
    ];
    for (const { description, act, getCount } of auditHookScenarios) {
      it(description, () => {
        const counter = VirtualTimeCounter.create({ 'startMs': 0 });
        const sched = new AuditVirtualScheduler(counter);
        act(sched);
        assert.strictEqual(getCount(sched), 1);
      });
    }

    it('virtualCounter getter is accessible from subclass', () => {
      class CounterAccessor extends VirtualScheduler {
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        public getCounter(): Readonly<VirtualTimeCounter> {
          return this.virtualCounter;
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new CounterAccessor(counter);

      assert.strictEqual(sched.getCounter().nowMs(), 0);
    });

    it('isCancelled accessible from subclass', () => {
      class CancelChecker extends VirtualScheduler {
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        public checkCancelled(id: string): boolean {
          return this.isCancelled(id);
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new CancelChecker(counter);
      const task = sched.scheduleAt(TASK_OFFSET_50, () => { return; });

      task.cancel();

      assert.strictEqual(sched.checkCancelled(task.id), true);
    });

    it('createHeap override — subclass can substitute a custom heap', () => {
      let heapCreatedCount = 0;

      class SpyHeapScheduler extends VirtualScheduler {
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override createHeap(): MinimumHeap {
          heapCreatedCount++;
          return MinimumHeap.create();
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
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
