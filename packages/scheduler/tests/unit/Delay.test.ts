/**
 * Unit tests for `Delay`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock';

import { Delay } from '../../src/delay/Delay.js';
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

/** Resolved value used by `Delay.value` tests. */
const RESOLVED_VALUE = 'payload';

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

    it('value resolves with the given value after ms', async () => {
      const counter = VirtualTimeCounter.create({ 'startMs': 0 });
      const scheduler = VirtualScheduler.create({ 'counter': counter });
      const clock = VirtualClockProvider.create(counter);

      const promise = Delay.value(VIRTUAL_SLEEP_MS, RESOLVED_VALUE, { 'clock': clock, 'scheduler': scheduler });

      scheduler.advance(VIRTUAL_SLEEP_MS);
      const result = await promise;

      assert.strictEqual(result, RESOLVED_VALUE);
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
  });
});
