/**
 * Retry Stats Unit Tests
 *
 * Tests for getStats() and resetStats() functionality
 */

import {
  deepStrictEqual, strictEqual
} from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { Retry } from '../../../src/retry/index.js';

void describe('Retry Stats', () => {
  void describe('getStats()', () => {
    void it('returns initial stats with all zeros', () => {
      const retry = new Retry({ maxRetries: 3 });
      const stats = retry.getStats();

      deepStrictEqual(stats, {
        failedRequests: 0,
        successfulRequests: 0,
        totalRequests: 0,
        totalRetries: 0
      });
    });

    void it('increments totalRequests on each execute call', async () => {
      const retry = new Retry({ maxRetries: 3 });

      await retry.execute(async () => {
        return 'first';
      });
      strictEqual(retry.getStats().totalRequests, 1);

      await retry.execute(async () => {
        return 'second';
      });
      strictEqual(retry.getStats().totalRequests, 2);

      await retry.execute(async () => {
        return 'third';
      });
      strictEqual(retry.getStats().totalRequests, 3);
    });

    void it('increments successfulRequests on success', async () => {
      const retry = new Retry({ maxRetries: 3 });

      await retry.execute(async () => {
        return 'success';
      });

      const stats = retry.getStats();

      strictEqual(stats.successfulRequests, 1);
      strictEqual(stats.failedRequests, 0);
    });

    void it('increments failedRequests on non-retryable error', async () => {
      const retry = new Retry({
        errorClassifier: () => {
          return { retryable: false };
        },
        maxRetries: 3
      });

      try {
        await retry.execute(async () => {
          throw new Error('Non-retryable');
        });
      } catch {
        // Expected
      }

      const stats = retry.getStats();

      strictEqual(stats.failedRequests, 1);
      strictEqual(stats.successfulRequests, 0);
    });

    void it('increments totalRetries for each retry attempt', async () => {
      let attempts = 0;
      const retry = new Retry({
        errorClassifier: () => {
          return { retryable: true };
        },
        maxRetries: 3,
        retryInterceptor: () => {
          return { delayMs: 0 };
        }
      });

      try {
        await retry.execute(async () => {
          attempts++;
          throw new Error('Always fail');
        });
      } catch {
        // Expected
      }

      const stats = retry.getStats();

      strictEqual(stats.totalRetries, 3, 'Should have 3 retries (attempts 1-3 after initial)');
      strictEqual(attempts, 4, 'Should have made 4 total attempts');
    });

    void it('returns frozen stats object', () => {
      const retry = new Retry({ maxRetries: 3 });
      const stats = retry.getStats();

      // Attempting to modify should have no effect
      try {
        (stats as unknown as Record<string, number>).totalRequests = 999;
      } catch {
        // May throw in strict mode
      }

      strictEqual(retry.getStats().totalRequests, 0, 'Original stats should be unchanged');
    });
  });

  void describe('resetStats()', () => {
    void it('resets all stats to zero', async () => {
      const retry = new Retry({ maxRetries: 3 });

      // Generate some stats
      await retry.execute(async () => {
        return 'first';
      });
      await retry.execute(async () => {
        return 'second';
      });

      strictEqual(retry.getStats().totalRequests, 2);

      retry.resetStats();

      deepStrictEqual(retry.getStats(), {
        failedRequests: 0,
        successfulRequests: 0,
        totalRequests: 0,
        totalRetries: 0
      });
    });

    void it('allows new stats accumulation after reset', async () => {
      const retry = new Retry({ maxRetries: 3 });

      await retry.execute(async () => {
        return 'first';
      });
      retry.resetStats();

      await retry.execute(async () => {
        return 'second';
      });
      await retry.execute(async () => {
        return 'third';
      });

      const stats = retry.getStats();

      strictEqual(stats.totalRequests, 2);
      strictEqual(stats.successfulRequests, 2);
    });
  });
});
