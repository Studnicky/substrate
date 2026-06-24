/**
 * BackoffStrategy.decorrelatedJitter Unit Tests
 */

import {
  ok, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import { BackoffStrategy } from '../../../src/retry/index.js';

// ---------------------------------------------------------------------------
// attempt 0 returns baseDelayMs exactly
// ---------------------------------------------------------------------------

const attempt0Scenarios: Array<{ description: string; baseDelay: number }> = [
  { description: 'decorrelatedJitter attempt 0 baseDelay 100 returns 100', baseDelay: 100 },
  { description: 'decorrelatedJitter attempt 0 baseDelay 50 returns 50', baseDelay: 50 },
  { description: 'decorrelatedJitter attempt 0 baseDelay 500 returns 500', baseDelay: 500 }
];

for (const { description, baseDelay } of attempt0Scenarios) {
  it(description, () => {
    strictEqual(BackoffStrategy.decorrelatedJitter(0, baseDelay), baseDelay);
  });
}

// ---------------------------------------------------------------------------
// attempt > 0 is always >= baseDelayMs
// ---------------------------------------------------------------------------

it('decorrelatedJitter returns a value >= baseDelayMs for attempt > 0', () => {
  const baseDelay = 100;

  for (let attempt = 1; attempt <= 10; attempt++) {
    for (let i = 0; i < 20; i++) {
      const delay = BackoffStrategy.decorrelatedJitter(attempt, baseDelay);
      ok(delay >= baseDelay, `Attempt ${attempt}: delay ${delay} should be >= baseDelay ${baseDelay}`);
    }
  }
});

// ---------------------------------------------------------------------------
// always <= 32 * baseDelayMs (max cap)
// ---------------------------------------------------------------------------

it('decorrelatedJitter returns a value <= 32 * baseDelayMs (max cap)', () => {
  const baseDelay = 100;
  const maxDelay = baseDelay * 32;

  for (let attempt = 0; attempt <= 20; attempt++) {
    for (let i = 0; i < 20; i++) {
      const delay = BackoffStrategy.decorrelatedJitter(attempt, baseDelay);
      ok(delay <= maxDelay, `Attempt ${attempt}: delay ${delay} should be <= maxDelay ${maxDelay}`);
    }
  }
});

// ---------------------------------------------------------------------------
// randomized — produces varying results
// ---------------------------------------------------------------------------

it('decorrelatedJitter produces varying results for the same attempt (randomized)', () => {
  const results = new Set<number>();

  for (let i = 0; i < 30; i++) {
    results.add(BackoffStrategy.decorrelatedJitter(2, 100));
  }

  ok(results.size > 1, 'Decorrelated jitter should produce varying results across calls');
});
