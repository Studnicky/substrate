/**
 * Unit tests for `Delay`.
 */
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { describe, it } from 'node:test';

import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock';

import type { ScheduledTaskInterface } from '../../src/interfaces/ScheduledTaskInterface.js';
import type { SchedulerProviderInterface } from '../../src/interfaces/SchedulerProviderInterface.js';

import { Delay } from '../../src/delay/Delay.js';
import { RealTimeScheduler } from '../../src/scheduler/RealTimeScheduler.js';
import { VirtualScheduler } from '../../src/scheduler/VirtualScheduler.js';

// ---------------------------------------------------------------------------
// Named constants for test values.
// ---------------------------------------------------------------------------

/** Real-time sleep duration, kept small so the test suite stays fast. */
const REAL_SLEEP_MS = 20;

/** Generous lower bound below `REAL_SLEEP_MS` to absorb timer jitter. */
const REAL_SLEEP_TOLERANCE_MS = 5;

/** Virtual sleep duration. */
const VIRTUAL_SLEEP_MS = 500;

/** Long real-time duration cancelled immediately so the test never waits for it. */
const REAL_ABORT_SLEEP_MS = 10_000;

class AuditRealTimeScheduler extends RealTimeScheduler {
  public cancelCount = 0;

  public constructor() {
    super();
  }

  protected override onCancel(_id: string): void {
    this.cancelCount = this.cancelCount + 1;
  }
}

class AuditVirtualScheduler extends VirtualScheduler {
  public cancelCount = 0;
  public fireCount = 0;
  public scheduleCount = 0;

  public constructor(counter: Readonly<VirtualTimeCounter>) {
    super(counter);
  }

  protected override onCancel(_id: string): void {
    this.cancelCount = this.cancelCount + 1;
  }

  protected override onFire(_id: string): void {
    this.fireCount = this.fireCount + 1;
  }

  protected override onSchedule(_id: string, _atMs: number, _variant: 'interval' | 'timeout'): void {
    this.scheduleCount = this.scheduleCount + 1;
  }
}

class ThrowingScheduler implements SchedulerProviderInterface {
  readonly #error: Error;

  public constructor(error: Error) {
    this.#error = error;
  }

  public cancelAll(): void {
    return;
  }

  public scheduleAt(_atMs: number, _fire: () => Promise<void> | void): ScheduledTaskInterface {
    throw this.#error;
  }

  public scheduleEvery(_intervalMs: number, _fire: () => Promise<void> | void): ScheduledTaskInterface {
    throw this.#error;
  }
}

describe('Delay', () => {
  describe('happy path', () => {
    it('sleep resolves after roughly ms in real time', async () => {
      const start = Date.now();
      await Delay.sleep(REAL_SLEEP_MS);
      const elapsed = Date.now() - start;

      assert.ok(elapsed >= REAL_SLEEP_MS - REAL_SLEEP_TOLERANCE_MS);
    });

    it('sleep resolves without real delay when driven by a VirtualScheduler', async () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const scheduler = VirtualScheduler.create({ 'counter': counter });
      const clock = VirtualClockProvider.create(counter);

      let resolved = false;
      const promise = Delay.sleep(VIRTUAL_SLEEP_MS, { 'clock': clock, 'scheduler': scheduler }).then(() => {
        resolved = true;
      });

      assert.strictEqual(resolved, false);

      scheduler.advance(VIRTUAL_SLEEP_MS);
      await promise;

      assert.strictEqual(resolved, true);
    });

    it('sleep rejects and cancels a pending RealTimeScheduler task when aborted', async () => {
      const scheduler = new AuditRealTimeScheduler();
      const controller = new AbortController();
      const reason = new Error('real-time delay aborted');
      const promise = Delay.sleep(REAL_ABORT_SLEEP_MS, { 'scheduler': scheduler, 'signal': controller.signal });

      controller.abort(reason);

      await assert.rejects(promise, (error: unknown) => {
        return error === reason;
      });
      assert.strictEqual(scheduler.cancelCount, 1);
    });

  });

  describe('edge cases', () => {
    it('sleep resolves immediately for ms=0 with a VirtualScheduler', async () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const scheduler = VirtualScheduler.create({ 'counter': counter });
      const clock = VirtualClockProvider.create(counter);

      const promise = Delay.sleep(0, { 'clock': clock, 'scheduler': scheduler });

      scheduler.advance(0);
      await promise;
    });

    it('defaults to RealTimeScheduler and RealTimeClockProvider when no options are given', async () => {
      await Delay.sleep(0);
    });

    it('pre-aborted sleep rejects with the exact reason without scheduling', async () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const scheduler = new AuditVirtualScheduler(counter);
      const clock = VirtualClockProvider.create(counter);
      const controller = new AbortController();
      const reason = new Error('already aborted');

      controller.abort(reason);

      await assert.rejects(
        Delay.sleep(VIRTUAL_SLEEP_MS, { 'clock': clock, 'scheduler': scheduler, 'signal': controller.signal }),
        (error: unknown) => {
          return error === reason;
        }
      );
      assert.strictEqual(scheduler.scheduleCount, 0);
    });

    it('abort during clock.now rejects with the exact reason without scheduling', async () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const scheduler = new AuditVirtualScheduler(counter);
      const controller = new AbortController();
      const reason = new Error('clock aborted delay');
      const clock = {
        hrtime(): bigint {
          return 0n;
        },
        now(): number {
          controller.abort(reason);
          return counter.nowMs();
        }
      };

      const promise = Delay.sleep(VIRTUAL_SLEEP_MS, { 'clock': clock, 'scheduler': scheduler, 'signal': controller.signal });

      await assert.rejects(promise, (error: unknown) => {
        return error === reason;
      });
      scheduler.advance(VIRTUAL_SLEEP_MS);

      assert.strictEqual(scheduler.scheduleCount, 0);
      assert.strictEqual(scheduler.cancelCount, 0);
      assert.strictEqual(scheduler.fireCount, 0);
      assert.strictEqual(getEventListeners(controller.signal, 'abort').length, 0);
    });

    it('abort during onSchedule cancels the returned task before later advancement', async () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const clock = VirtualClockProvider.create(counter);
      const controller = new AbortController();
      const reason = new Error('schedule hook aborted delay');

      class AbortOnScheduleScheduler extends AuditVirtualScheduler {
        public constructor() {
          super(counter);
        }

        protected override onSchedule(id: string, atMs: number, variant: 'interval' | 'timeout'): void {
          super.onSchedule(id, atMs, variant);
          controller.abort(reason);
        }
      }

      const scheduler = new AbortOnScheduleScheduler();
      const promise = Delay.sleep(VIRTUAL_SLEEP_MS, { 'clock': clock, 'scheduler': scheduler, 'signal': controller.signal });

      await assert.rejects(promise, (error: unknown) => {
        return error === reason;
      });
      scheduler.advance(VIRTUAL_SLEEP_MS);

      assert.strictEqual(scheduler.scheduleCount, 1);
      assert.strictEqual(scheduler.cancelCount, 1);
      assert.strictEqual(scheduler.fireCount, 0);
      assert.strictEqual(getEventListeners(controller.signal, 'abort').length, 0);
    });

    it('pending abort cancels the virtual task and later advancement stays inert', async () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const scheduler = new AuditVirtualScheduler(counter);
      const clock = VirtualClockProvider.create(counter);
      const controller = new AbortController();
      const reason = new Error('pending delay aborted');
      const promise = Delay.sleep(VIRTUAL_SLEEP_MS, {
        'clock': clock,
        'scheduler': scheduler,
        'signal': controller.signal
      });

      controller.abort(reason);

      await assert.rejects(promise, (error: unknown) => {
        return error === reason;
      });
      scheduler.advance(VIRTUAL_SLEEP_MS);

      assert.strictEqual(scheduler.cancelCount, 1);
      assert.strictEqual(scheduler.fireCount, 0);
    });

    it('abort after completion is inert', async () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const scheduler = new AuditVirtualScheduler(counter);
      const clock = VirtualClockProvider.create(counter);
      const controller = new AbortController();
      const promise = Delay.sleep(VIRTUAL_SLEEP_MS, {
        'clock': clock,
        'scheduler': scheduler,
        'signal': controller.signal
      });

      scheduler.advance(VIRTUAL_SLEEP_MS);
      await promise;
      controller.abort(new Error('late abort'));

      assert.strictEqual(scheduler.fireCount, 1);
      assert.strictEqual(scheduler.cancelCount, 0);
    });

    it('scheduleAt failure removes the abort listener and preserves the error', async () => {
      const controller = new AbortController();
      const schedulerError = new Error('scheduleAt failed');
      const listenersBefore = getEventListeners(controller.signal, 'abort').length;
      const promise = Delay.sleep(VIRTUAL_SLEEP_MS, {
        'scheduler': new ThrowingScheduler(schedulerError),
        'signal': controller.signal
      });

      assert.strictEqual(getEventListeners(controller.signal, 'abort').length, listenersBefore);
      await assert.rejects(promise, (error: unknown) => {
        return error === schedulerError;
      });
    });

  });
});
