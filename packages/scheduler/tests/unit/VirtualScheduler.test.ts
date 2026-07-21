/**
 * Unit tests for `VirtualScheduler`.
 * Requires `@studnicky/clock` — `VirtualTimeCounter` and `VirtualClockProvider`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock';
import { HookInvocationError, HookInvoker } from '@studnicky/errors';

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
// MinimumHeap tests
// ---------------------------------------------------------------------------

describe('MinimumHeap', () => {
  it('snapshots inserted tasks so caller mutation cannot corrupt ordering or removal data', () => {
    const first: {
      atMs: number;
      fire: () => void;
      id: string;
      intervalMs: number;
      variant: 'timeout';
    } = {
      'atMs': 10,
      'fire': (): void => {},
      'id': 'first',
      'intervalMs': 0,
      'variant': 'timeout'
    };
    const second: {
      atMs: number;
      fire: () => void;
      id: string;
      intervalMs: number;
      variant: 'timeout';
    } = {
      'atMs': 20,
      'fire': (): void => {},
      'id': 'second',
      'intervalMs': 0,
      'variant': 'timeout'
    };
    const heap = MinimumHeap.create();

    heap.insert(first);
    heap.insert(second);
    first.atMs = 100;
    first.id = 'mutated';
    second.atMs = 1;

    assert.strictEqual(heap.peekAtMs(), 10);
    const removed = heap.removeMinimum();
    assert.deepStrictEqual(removed, {
      'atMs': 10,
      'fire': first.fire,
      'id': 'first',
      'intervalMs': 0,
      'variant': 'timeout'
    });
    assert.strictEqual(heap.peekAtMs(), 20);
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

    it('scheduleEvery with intervalMs of 0 throws synchronously and does not hang', () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = VirtualScheduler.create({ 'counter': counter });

      assert.throws(() => { sched.scheduleEvery(0, () => { return; }); });
    });

    it('scheduleEvery with a negative intervalMs throws synchronously and does not hang', () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = VirtualScheduler.create({ 'counter': counter });

      assert.throws(() => { sched.scheduleEvery(NEGATIVE_ADVANCE, () => { return; }); });
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

    it('repeated task cancellation invokes onCancel once and never fires', () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new AuditVirtualScheduler(counter);
      const task = sched.scheduleAt(TASK_OFFSET_50, () => { return; });

      task.cancel();
      task.cancel();
      sched.advance(ADVANCE_PASS);

      assert.strictEqual(sched.cancelCount, 1);
      assert.strictEqual(sched.fireCount, 0);
    });

    it('cancellation after a task fires is an observable no-op', () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new AuditVirtualScheduler(counter);
      const task = sched.scheduleAt(TASK_OFFSET_50, () => { return; });

      sched.advance(ADVANCE_PASS);
      task.cancel();
      task.cancel();

      assert.strictEqual(sched.fireCount, 1);
      assert.strictEqual(sched.cancelCount, 0);
    });

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

    // -------------------------------------------------------------------------
    // New hooks: onFireError, onReschedule, onIdle
    // -------------------------------------------------------------------------

    it('onFireError fires when a synchronously-throwing task is run via runAll', () => {
      class ErrorHookScheduler extends VirtualScheduler {
        public fireErrorIds: string[] = [];
        public fireErrorValues: unknown[] = [];
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onFireError(id: string, error: unknown): void {
          this.fireErrorIds.push(id);
          this.fireErrorValues.push(error);
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new ErrorHookScheduler(counter);
      const thrownError = new Error('task boom');

      sched.scheduleAt(TASK_OFFSET_50, () => { throw thrownError; });
      sched.runAll();

      assert.strictEqual(sched.fireErrorIds.length, 1);
      assert.strictEqual(sched.fireErrorValues[0], thrownError);
    });

    it('onFireError fires when a synchronously-throwing task is run via advance', () => {
      class ErrorHookScheduler extends VirtualScheduler {
        public fireErrorCount = 0;
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onFireError(_id: string, _error: unknown): void {
          this.fireErrorCount++;
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new ErrorHookScheduler(counter);

      sched.scheduleAt(TASK_OFFSET_50, () => { throw new Error('sync throw'); });
      sched.advance(ADVANCE_PASS);

      assert.strictEqual(sched.fireErrorCount, 1);
    });

    it('onFireError fires for an async-rejecting task run via runAll', async () => {
      class AsyncErrorHookScheduler extends VirtualScheduler {
        public asyncErrorCount = 0;
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onFireError(_id: string, _error: unknown): void {
          this.asyncErrorCount++;
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new AsyncErrorHookScheduler(counter);

      sched.scheduleAt(TASK_OFFSET_50, async () => { throw new Error('async reject'); });
      sched.runAll();

      // Allow the microtask queue to flush so the promise rejection is handled.
      await Promise.resolve();
      await Promise.resolve();

      assert.strictEqual(sched.asyncErrorCount, 1);
    });

    it('onReschedule fires once per interval task re-arm after fire', () => {
      class RescheduleHookScheduler extends VirtualScheduler {
        public rescheduleIds: string[] = [];
        public rescheduleAtMs: number[] = [];
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onReschedule(id: string, atMs: number): void {
          this.rescheduleIds.push(id);
          this.rescheduleAtMs.push(atMs);
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new RescheduleHookScheduler(counter);

      // interval=100; advance=300 → fires at 100, 200, 300 → 3 reschedules (after each fire)
      sched.scheduleEvery(INTERVAL_100, () => { return; });
      sched.advance(ADVANCE_MULTI);

      assert.strictEqual(sched.rescheduleIds.length, EXPECTED_FIRES_3);
      // Each reschedule atMs should be the prior fire atMs + interval
      assert.strictEqual(sched.rescheduleAtMs[0], INTERVAL_100 + INTERVAL_100);
      assert.strictEqual(sched.rescheduleAtMs[1], INTERVAL_100 + INTERVAL_100 + INTERVAL_100);
    });

    it('onReschedule does not fire for cancelled interval tasks', () => {
      class RescheduleHookScheduler extends VirtualScheduler {
        public rescheduleCount = 0;
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onReschedule(_id: string, _atMs: number): void {
          this.rescheduleCount++;
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new RescheduleHookScheduler(counter);
      const task = sched.scheduleEvery(INTERVAL_100, () => { return; });

      // Fire once (reschedule happens), then cancel, then advance again (no more reschedule)
      sched.advance(INTERVAL_100);
      task.cancel();
      sched.advance(ADVANCE_200);

      // Only 1 reschedule: the one right after the first fire
      assert.strictEqual(sched.rescheduleCount, 1);
    });

    it('onIdle fires after runAll empties the heap', () => {
      class IdleHookScheduler extends VirtualScheduler {
        public idleCount = 0;
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onIdle(): void {
          this.idleCount++;
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new IdleHookScheduler(counter);

      sched.scheduleAt(TASK_OFFSET_50, () => { return; });
      sched.runAll();

      // runAll always calls onIdle at the end (heap is empty after draining)
      assert.strictEqual(sched.idleCount, 1);
    });

    it('onIdle fires after advance drains all tasks', () => {
      class IdleHookScheduler extends VirtualScheduler {
        public idleCount = 0;
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onIdle(): void {
          this.idleCount++;
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new IdleHookScheduler(counter);

      sched.scheduleAt(TASK_OFFSET_50, () => { return; });
      // Advance past the only task — heap drains → onIdle
      sched.advance(ADVANCE_PASS);

      assert.strictEqual(sched.idleCount, 1);
    });

    it('onIdle fires after cancelAll', () => {
      class IdleHookScheduler extends VirtualScheduler {
        public idleCount = 0;
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onIdle(): void {
          this.idleCount++;
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new IdleHookScheduler(counter);

      sched.scheduleAt(TASK_OFFSET_50, () => { return; });
      sched.cancelAll();

      assert.strictEqual(sched.idleCount, 1);
    });

    it('onIdle does NOT fire when tasks remain after partial advance', () => {
      class IdleHookScheduler extends VirtualScheduler {
        public idleCount = 0;
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onIdle(): void {
          this.idleCount++;
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new IdleHookScheduler(counter);

      // Schedule two tasks; advance past only the first
      sched.scheduleAt(TASK_OFFSET_50, () => { return; });
      sched.scheduleAt(EXPECTED_150, () => { return; });
      sched.advance(ADVANCE_PASS);

      // Heap still has the task at 150 — must NOT idle
      assert.strictEqual(sched.idleCount, 0);
    });

    it('a throwing onSchedule hook does not replace task registration', () => {
      class ThrowingScheduleScheduler extends VirtualScheduler {
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onSchedule(): void {
          throw new Error('onSchedule boom');
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new ThrowingScheduleScheduler(counter);
      const task = sched.scheduleAt(TASK_OFFSET_50, () => { return; });

      assert.ok(task.id.length > 0);
    });

    it('a throwing onFire hook does not replace due task execution', () => {
      class ThrowingFireScheduler extends VirtualScheduler {
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onFire(): void {
          throw new Error('onFire boom');
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new ThrowingFireScheduler(counter);
      let fired = false;

      sched.scheduleAt(TASK_OFFSET_50, () => {
        fired = true;
      });
      sched.advance(ADVANCE_PASS);

      assert.strictEqual(fired, true);
    });

    it('a throwing onFire hook is wrapped in a HookInvocationError and passed to onHookError', () => {
      let receivedError: HookInvocationError | undefined;

      class RecordingHookInvoker extends HookInvoker {
        protected override onHookError(hookName: string, cause: unknown): void {
          receivedError = new HookInvocationError(hookName, cause);
        }
      }

      class ObservedThrowingFireScheduler extends VirtualScheduler {
        protected override readonly hooks: HookInvoker = new RecordingHookInvoker();
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onFire(): void {
          throw new Error('onFire boom');
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new ObservedThrowingFireScheduler(counter);

      sched.scheduleAt(TASK_OFFSET_50, () => { return; });
      sched.advance(ADVANCE_PASS);

      assert.ok(receivedError instanceof HookInvocationError);
      assert.strictEqual(receivedError.hookName, 'onFire');
      assert.ok(receivedError.cause instanceof Error);
      assert.strictEqual(receivedError.cause.message, 'onFire boom');
    });

    it('a throwing onReschedule hook does not stop interval rescheduling', () => {
      class ThrowingRescheduleScheduler extends VirtualScheduler {
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onReschedule(): void {
          throw new Error('onReschedule boom');
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new ThrowingRescheduleScheduler(counter);
      let count = 0;

      sched.scheduleEvery(INTERVAL_100, () => {
        count++;
      });
      sched.advance(ADVANCE_MULTI);

      assert.strictEqual(count, EXPECTED_FIRES_3);
    });

    it('a throwing onFireError hook does not replace swallowed task failure', () => {
      class ThrowingFireErrorScheduler extends VirtualScheduler {
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
        protected override onFireError(): void {
          throw new Error('onFireError boom');
        }
      }

      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const sched = new ThrowingFireErrorScheduler(counter);

      sched.scheduleAt(TASK_OFFSET_50, () => { throw new Error('task boom'); });
      sched.runAll();

      assert.ok(true);
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

      class AsyncRejectingFireScheduler extends VirtualScheduler {
        protected override readonly hooks: HookInvoker = new RecordingSwallowingInvoker();
        public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
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

      try {
        const counter = VirtualTimeCounter.create({ 'startMs': 0 });
        const sched = new AsyncRejectingFireScheduler(counter);

        sched.scheduleAt(TASK_OFFSET_50, () => { return; });
        sched.runAll();

        await Promise.resolve();
        await Promise.resolve();

        assert.strictEqual(rejectionEvents.length, 0);
        assert.deepStrictEqual(recordedHookNames, ['onFire']);
        assert.strictEqual(recordedCauses[0], rejectionError);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    });
  });
});
