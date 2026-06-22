/**
 * BackoffStrategy.decorrelatedJitter Unit Tests
 */

import {
  ok, strictEqual
} from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { BackoffStrategy } from '../../../src/retry/index.js';

void describe('BackoffStrategy.decorrelatedJitter', () => {
  void it('returns baseDelayMs for attempt 0', () => {
    strictEqual(BackoffStrategy.decorrelatedJitter(0, 100), 100);
    strictEqual(BackoffStrategy.decorrelatedJitter(0, 50), 50);
    strictEqual(BackoffStrategy.decorrelatedJitter(0, 500), 500);
  });

  void it('returns a value >= baseDelayMs for attempt > 0', () => {
    const baseDelay = 100;

    for (let attempt = 1; attempt <= 10; attempt++) {
      for (let i = 0; i < 20; i++) {
        const delay = BackoffStrategy.decorrelatedJitter(attempt, baseDelay);

        ok(delay >= baseDelay, `Attempt ${attempt}: delay ${delay} should be >= baseDelay ${baseDelay}`);
      }
    }
  });

  void it('returns a value <= 32 * baseDelayMs (max cap)', () => {
    const baseDelay = 100;
    const maxDelay = baseDelay * 32;

    for (let attempt = 0; attempt <= 20; attempt++) {
      for (let i = 0; i < 20; i++) {
        const delay = BackoffStrategy.decorrelatedJitter(attempt, baseDelay);

        ok(delay <= maxDelay, `Attempt ${attempt}: delay ${delay} should be <= maxDelay ${maxDelay}`);
      }
    }
  });

  void it('produces varying results for the same attempt (randomized)', () => {
    const results = new Set<number>();

    for (let i = 0; i < 30; i++) {
      results.add(BackoffStrategy.decorrelatedJitter(2, 100));
    }

    ok(results.size > 1, 'Decorrelated jitter should produce varying results across calls');
  });
});
