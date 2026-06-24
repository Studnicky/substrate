/**
 * Retry Stats Unit Tests
 *
 * Tests for getStats() and resetStats() functionality.
 */

import {
  deepStrictEqual, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import { Retry } from '../../../src/retry/index.js';

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialStatsScenarios: Array<{ description: string; build: () => Retry }> = [
  {
    description: 'getStats() returns all zeros for new Retry({ maxRetries: 3 })',
    build: () => new Retry({ maxRetries: 3 })
  },
  {
    description: 'getStats() returns all zeros for new Retry() with defaults',
    build: () => new Retry()
  }
];

const ZERO_STATS = {
  failedRequests: 0,
  successfulRequests: 0,
  totalRequests: 0,
  totalRetries: 0
};

for (const { description, build } of initialStatsScenarios) {
  it(description, () => {
    deepStrictEqual(build().getStats(), ZERO_STATS);
  });
}

// ---------------------------------------------------------------------------
// totalRequests increments on each execute call
// ---------------------------------------------------------------------------

it('getStats().totalRequests increments on each execute call', async () => {
  const retry = new Retry({ maxRetries: 3 });

  await retry.execute(async () => 'first');
  strictEqual(retry.getStats().totalRequests, 1);

  await retry.execute(async () => 'second');
  strictEqual(retry.getStats().totalRequests, 2);

  await retry.execute(async () => 'third');
  strictEqual(retry.getStats().totalRequests, 3);
});

// ---------------------------------------------------------------------------
// successfulRequests / failedRequests
// ---------------------------------------------------------------------------

it('getStats().successfulRequests increments on success', async () => {
  const retry = new Retry({ maxRetries: 3 });

  await retry.execute(async () => 'success');

  const stats = retry.getStats();
  strictEqual(stats.successfulRequests, 1);
  strictEqual(stats.failedRequests, 0);
});

it('getStats().failedRequests increments on non-retryable error', async () => {
  const retry = new Retry({
    errorClassifier: () => ({ retryable: false }),
    maxRetries: 3
  });

  try {
    await retry.execute(async () => { throw new Error('Non-retryable'); });
  } catch {
    // expected
  }

  const stats = retry.getStats();
  strictEqual(stats.failedRequests, 1);
  strictEqual(stats.successfulRequests, 0);
});

// ---------------------------------------------------------------------------
// totalRetries
// ---------------------------------------------------------------------------

it('getStats().totalRetries counts retry attempts (not the initial attempt)', async () => {
  let attempts = 0;
  const retry = new Retry({
    errorClassifier: () => ({ retryable: true }),
    maxRetries: 3,
    retryInterceptor: () => ({ delayMs: 0 })
  });

  try {
    await retry.execute(async () => {
      attempts++;
      throw new Error('Always fail');
    });
  } catch {
    // expected
  }

  const stats = retry.getStats();
  strictEqual(stats.totalRetries, 3, 'Should have 3 retries (attempts 1–3 after initial)');
  strictEqual(attempts, 4, 'Should have made 4 total attempts');
});

// ---------------------------------------------------------------------------
// Frozen stats object
// ---------------------------------------------------------------------------

it('getStats() returns a frozen stats object', () => {
  const retry = new Retry({ maxRetries: 3 });
  const stats = retry.getStats();

  try {
    (stats as unknown as Record<string, number>).totalRequests = 999;
  } catch {
    // may throw in strict mode
  }

  strictEqual(retry.getStats().totalRequests, 0, 'Original stats should be unchanged');
});

// ---------------------------------------------------------------------------
// resetStats()
// ---------------------------------------------------------------------------

it('resetStats() resets all stats to zero', async () => {
  const retry = new Retry({ maxRetries: 3 });

  await retry.execute(async () => 'first');
  await retry.execute(async () => 'second');
  strictEqual(retry.getStats().totalRequests, 2);

  retry.resetStats();

  deepStrictEqual(retry.getStats(), ZERO_STATS);
});

it('resetStats() allows new stats accumulation after reset', async () => {
  const retry = new Retry({ maxRetries: 3 });

  await retry.execute(async () => 'first');
  retry.resetStats();

  await retry.execute(async () => 'second');
  await retry.execute(async () => 'third');

  const stats = retry.getStats();
  strictEqual(stats.totalRequests, 2);
  strictEqual(stats.successfulRequests, 2);
});
