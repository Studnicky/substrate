/**
 * Throttle Synchronous Throw Regression Tests
 *
 * Covers a slot-leak bug: a non-async fn that throws synchronously before
 * returning a promise must still release its concurrency slot, otherwise
 * enough such calls (equal to concurrencyLimit) deadlock the throttle.
 */

import {
  rejects, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import { Throttle } from '../../../src/throttle/index.js';

void it('releases the slot when fn throws synchronously before returning a promise', async () => {
  const concurrencyLimit = 2;
  const throttle = Throttle.create({ concurrencyLimit });

  const throwingFn = (): Promise<never> => {
    throw new Error('synchronous failure');
  };

  for (let i = 0; i < concurrencyLimit; i++) {
    await rejects(
      throttle.execute(throwingFn),
      /synchronous failure/,
      'execute() should reject with the synchronous error'
    );
  }

  const stats = throttle.getStats();

  strictEqual(stats.activeCount, 0, 'activeCount should be released, not leaked');

  const result = await throttle.execute(async () => 'recovered');

  strictEqual(result, 'recovered', 'throttle should not be deadlocked after synchronous throws');
});
