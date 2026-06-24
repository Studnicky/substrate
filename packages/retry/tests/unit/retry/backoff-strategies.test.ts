/**
 * Backoff Strategy Unit Tests
 *
 * Tests for all backoff strategy static methods on BackoffStrategy.
 */

import {
  ok, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import type { BackoffStrategyType } from '../../../src/types/BackoffStrategyType.js';

import { BackoffStrategy } from '../../../src/retry/index.js';

// ---------------------------------------------------------------------------
// BackoffStrategy.constant
// ---------------------------------------------------------------------------

const constantScenarios: Array<{
  description: string;
  attempt: number;
  baseDelay: number;
  expected: number;
}> = [
  { description: 'constant attempt 0 baseDelay 100 returns 100', attempt: 0, baseDelay: 100, expected: 100 },
  { description: 'constant attempt 1 baseDelay 100 returns 100', attempt: 1, baseDelay: 100, expected: 100 },
  { description: 'constant attempt 2 baseDelay 100 returns 100', attempt: 2, baseDelay: 100, expected: 100 },
  { description: 'constant attempt 5 baseDelay 100 returns 100', attempt: 5, baseDelay: 100, expected: 100 },
  { description: 'constant attempt 10 baseDelay 100 returns 100', attempt: 10, baseDelay: 100, expected: 100 },
  { description: 'constant attempt 0 baseDelay 50 returns 50', attempt: 0, baseDelay: 50, expected: 50 },
  { description: 'constant attempt 0 baseDelay 200 returns 200', attempt: 0, baseDelay: 200, expected: 200 },
  { description: 'constant attempt 0 baseDelay 1000 returns 1000', attempt: 0, baseDelay: 1000, expected: 1000 }
];

for (const { description, attempt, baseDelay, expected } of constantScenarios) {
  it(description, () => {
    strictEqual(BackoffStrategy.constant(attempt, baseDelay), expected);
  });
}

// ---------------------------------------------------------------------------
// BackoffStrategy.linear
// ---------------------------------------------------------------------------

const linearScenarios: Array<{
  description: string;
  attempt: number;
  baseDelay: number;
  expected: number;
}> = [
  { description: 'linear attempt 0 baseDelay 100 returns 100', attempt: 0, baseDelay: 100, expected: 100 },
  { description: 'linear attempt 1 baseDelay 100 returns 200', attempt: 1, baseDelay: 100, expected: 200 },
  { description: 'linear attempt 2 baseDelay 100 returns 300', attempt: 2, baseDelay: 100, expected: 300 },
  { description: 'linear attempt 3 baseDelay 100 returns 400', attempt: 3, baseDelay: 100, expected: 400 },
  { description: 'linear attempt 4 baseDelay 100 returns 500', attempt: 4, baseDelay: 100, expected: 500 },
  { description: 'linear attempt 0 baseDelay 50 returns 50', attempt: 0, baseDelay: 50, expected: 50 },
  { description: 'linear attempt 1 baseDelay 50 returns 100', attempt: 1, baseDelay: 50, expected: 100 },
  { description: 'linear attempt 2 baseDelay 50 returns 150', attempt: 2, baseDelay: 50, expected: 150 }
];

for (const { description, attempt, baseDelay, expected } of linearScenarios) {
  it(description, () => {
    strictEqual(BackoffStrategy.linear(attempt, baseDelay), expected);
  });
}

// ---------------------------------------------------------------------------
// BackoffStrategy.exponential
// ---------------------------------------------------------------------------

const exponentialScenarios: Array<{
  description: string;
  attempt: number;
  baseDelay: number;
  expected: number;
}> = [
  { description: 'exponential attempt 0 baseDelay 100 returns 100', attempt: 0, baseDelay: 100, expected: 100 },
  { description: 'exponential attempt 1 baseDelay 100 returns 200', attempt: 1, baseDelay: 100, expected: 200 },
  { description: 'exponential attempt 2 baseDelay 100 returns 400', attempt: 2, baseDelay: 100, expected: 400 },
  { description: 'exponential attempt 3 baseDelay 100 returns 800', attempt: 3, baseDelay: 100, expected: 800 },
  { description: 'exponential attempt 4 baseDelay 100 returns 1600', attempt: 4, baseDelay: 100, expected: 1600 },
  { description: 'exponential attempt 0 baseDelay 50 returns 50', attempt: 0, baseDelay: 50, expected: 50 },
  { description: 'exponential attempt 1 baseDelay 50 returns 100', attempt: 1, baseDelay: 50, expected: 100 },
  { description: 'exponential attempt 2 baseDelay 50 returns 200', attempt: 2, baseDelay: 50, expected: 200 },
  { description: 'exponential attempt 3 baseDelay 50 returns 400', attempt: 3, baseDelay: 50, expected: 400 }
];

for (const { description, attempt, baseDelay, expected } of exponentialScenarios) {
  it(description, () => {
    strictEqual(BackoffStrategy.exponential(attempt, baseDelay), expected);
  });
}

// ---------------------------------------------------------------------------
// BackoffStrategy.exponentialWithJitter — randomized, range-checked
// ---------------------------------------------------------------------------

const jitterRangeScenarios: Array<{
  description: string;
  attempt: number;
  minMultiplier: number;
  maxMultiplier: number;
}> = [
  { description: 'exponentialWithJitter attempt 0 baseDelay 100 is within 50–150', attempt: 0, minMultiplier: 0.5, maxMultiplier: 1.5 },
  { description: 'exponentialWithJitter attempt 1 baseDelay 100 is within 100–300', attempt: 1, minMultiplier: 0.5, maxMultiplier: 1.5 },
  { description: 'exponentialWithJitter attempt 2 baseDelay 100 is within 200–600', attempt: 2, minMultiplier: 0.5, maxMultiplier: 1.5 },
  { description: 'exponentialWithJitter attempt 3 baseDelay 100 is within 400–1200', attempt: 3, minMultiplier: 0.5, maxMultiplier: 1.5 }
];

const BASE_DELAY_JITTER = 100;

for (const { description, attempt, minMultiplier, maxMultiplier } of jitterRangeScenarios) {
  it(description, () => {
    const exponentialBase = BASE_DELAY_JITTER * Math.pow(2, attempt);
    const minExpected = Math.floor(exponentialBase * minMultiplier);
    const maxExpected = Math.floor(exponentialBase * maxMultiplier);

    for (let i = 0; i < 50; i++) {
      const delay = BackoffStrategy.exponentialWithJitter(attempt, BASE_DELAY_JITTER);
      ok(delay >= minExpected, `Attempt ${attempt}: delay ${delay} should be >= ${minExpected}`);
      ok(delay <= maxExpected, `Attempt ${attempt}: delay ${delay} should be <= ${maxExpected}`);
    }
  });
}

it('exponentialWithJitter produces varying results due to jitter', () => {
  const results = new Set<number>();

  for (let i = 0; i < 20; i++) {
    results.add(BackoffStrategy.exponentialWithJitter(0, 100));
  }

  ok(results.size > 1, 'Jitter should produce varying results');
});

// ---------------------------------------------------------------------------
// BackoffStrategy.withCeiling
// ---------------------------------------------------------------------------

const withCeilingScenarios: Array<{
  description: string;
  strategy: BackoffStrategyType;
  ceiling: number;
  attempt: number;
  baseDelay: number;
  expected: number;
}> = [
  { description: 'withCeiling(exponential, 500) attempt 0 baseDelay 100 returns 100', strategy: BackoffStrategy.exponential, ceiling: 500, attempt: 0, baseDelay: 100, expected: 100 },
  { description: 'withCeiling(exponential, 500) attempt 1 baseDelay 100 returns 200', strategy: BackoffStrategy.exponential, ceiling: 500, attempt: 1, baseDelay: 100, expected: 200 },
  { description: 'withCeiling(exponential, 500) attempt 2 baseDelay 100 returns 400', strategy: BackoffStrategy.exponential, ceiling: 500, attempt: 2, baseDelay: 100, expected: 400 },
  { description: 'withCeiling(exponential, 500) attempt 3 baseDelay 100 caps at 500', strategy: BackoffStrategy.exponential, ceiling: 500, attempt: 3, baseDelay: 100, expected: 500 },
  { description: 'withCeiling(exponential, 500) attempt 4 baseDelay 100 caps at 500', strategy: BackoffStrategy.exponential, ceiling: 500, attempt: 4, baseDelay: 100, expected: 500 },
  { description: 'withCeiling(linear, 300) attempt 0 baseDelay 100 returns 100', strategy: BackoffStrategy.linear, ceiling: 300, attempt: 0, baseDelay: 100, expected: 100 },
  { description: 'withCeiling(linear, 300) attempt 1 baseDelay 100 returns 200', strategy: BackoffStrategy.linear, ceiling: 300, attempt: 1, baseDelay: 100, expected: 200 },
  { description: 'withCeiling(linear, 300) attempt 2 baseDelay 100 returns 300 at ceiling', strategy: BackoffStrategy.linear, ceiling: 300, attempt: 2, baseDelay: 100, expected: 300 },
  { description: 'withCeiling(linear, 300) attempt 3 baseDelay 100 caps at 300', strategy: BackoffStrategy.linear, ceiling: 300, attempt: 3, baseDelay: 100, expected: 300 },
  { description: 'withCeiling(constant, 500) attempt 0 baseDelay 100 unaffected returns 100', strategy: BackoffStrategy.constant, ceiling: 500, attempt: 0, baseDelay: 100, expected: 100 },
  { description: 'withCeiling(constant, 500) attempt 5 baseDelay 100 unaffected returns 100', strategy: BackoffStrategy.constant, ceiling: 500, attempt: 5, baseDelay: 100, expected: 100 },
  { description: 'withCeiling(constant, 500) attempt 10 baseDelay 100 unaffected returns 100', strategy: BackoffStrategy.constant, ceiling: 500, attempt: 10, baseDelay: 100, expected: 100 },
  { description: 'withCeiling(constant, 50) caps baseDelay 100 at ceiling 50', strategy: BackoffStrategy.constant, ceiling: 50, attempt: 0, baseDelay: 100, expected: 50 }
];

for (const { description, strategy, ceiling, attempt, baseDelay, expected } of withCeilingScenarios) {
  it(description, () => {
    const capped = BackoffStrategy.withCeiling(strategy, ceiling);
    strictEqual(capped(attempt, baseDelay), expected);
  });
}
