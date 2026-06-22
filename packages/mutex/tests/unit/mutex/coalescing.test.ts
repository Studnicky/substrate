/**
 * Mutex Coalescing Unit Tests
 *
 * Tests the request coalescing feature where concurrent calls
 * to runExclusive with the same key share the result of the
 * first in-flight operation.
 */

import { strictEqual } from 'node:assert/strict';
import {
  describe, it
} from 'node:test';
import {
  setTimeout as delay
} from 'node:timers/promises';

import {
  Mutex, MutexBuilder
} from '../../../src/mutex/index.js';
import { coalescingConfig } from '../../fixtures/constants.js';

void describe('Request Coalescing', () => {
  void describe('Basic Coalescing Behavior', () => {
    void it('shares result when coalescing is enabled', async () => {
      const mutex = Mutex.create(coalescingConfig);
      let executionCount = 0;

      const operation = async (): Promise<string> => {
        executionCount++;
        await delay(50);

        return 'result';
      };

      const [
        result1,
        result2,
        result3
      ] = await Promise.all([
        mutex.runExclusive('key1', operation),
        mutex.runExclusive('key1', operation),
        mutex.runExclusive('key1', operation)
      ]);

      strictEqual(executionCount, 1, 'Operation should only execute once');
      strictEqual(result1, 'result');
      strictEqual(result2, 'result');
      strictEqual(result3, 'result');
    });

    void it('does NOT share result when coalescing is disabled (default)', async () => {
      const mutex = Mutex.create();
      let executionCount = 0;

      const operation = async (): Promise<string> => {
        executionCount++;
        await delay(10);

        return `result-${executionCount}`;
      };

      const [
        result1,
        result2,
        result3
      ] = await Promise.all([
        mutex.runExclusive('key1', operation),
        mutex.runExclusive('key1', operation),
        mutex.runExclusive('key1', operation)
      ]);

      strictEqual(executionCount, 3, 'Operation should execute for each call');
      strictEqual(result1, 'result-1');
      strictEqual(result2, 'result-2');
      strictEqual(result3, 'result-3');
    });

    void it('coalesces per key independently', async () => {
      const mutex = Mutex.create(coalescingConfig);
      const executionCounts = {
        key1: 0,
        key2: 0
      };

      const createOperation = (key: 'key1' | 'key2') => {
        return async (): Promise<string> => {
          executionCounts[key]++;
          await delay(50);

          return `${key}-result`;
        };
      };

      const results = await Promise.all([
        mutex.runExclusive('key1', createOperation('key1')),
        mutex.runExclusive('key1', createOperation('key1')),
        mutex.runExclusive('key2', createOperation('key2')),
        mutex.runExclusive('key2', createOperation('key2'))
      ]);

      strictEqual(executionCounts.key1, 1, 'key1 should execute once');
      strictEqual(executionCounts.key2, 1, 'key2 should execute once');
      strictEqual(results[0], 'key1-result');
      strictEqual(results[1], 'key1-result');
      strictEqual(results[2], 'key2-result');
      strictEqual(results[3], 'key2-result');
    });

    void it('allows new execution after previous completes', async () => {
      const mutex = Mutex.create(coalescingConfig);
      let executionCount = 0;

      const operation = async (): Promise<number> => {
        executionCount++;

        return executionCount;
      };

      const result1 = await mutex.runExclusive('key1', operation);

      strictEqual(result1, 1);

      const result2 = await mutex.runExclusive('key1', operation);

      strictEqual(result2, 2);
      strictEqual(executionCount, 2, 'Should execute twice for sequential calls');
    });
  });

  void describe('Error Handling with Coalescing', () => {
    void it('propagates errors to all coalesced callers', async () => {
      const mutex = Mutex.create(coalescingConfig);
      let executionCount = 0;

      const failingOperation = async (): Promise<string> => {
        executionCount++;
        await delay(50);
        throw new Error('Operation failed');
      };

      const results = await Promise.allSettled([
        mutex.runExclusive('key1', failingOperation),
        mutex.runExclusive('key1', failingOperation),
        mutex.runExclusive('key1', failingOperation)
      ]);

      strictEqual(executionCount, 1, 'Operation should only execute once');
      strictEqual(results[0].status, 'rejected');
      strictEqual(results[1].status, 'rejected');
      strictEqual(results[2].status, 'rejected');

      const rejected = results[0];
      const error = rejected.reason as Error;

      strictEqual(error.message, 'Operation failed');
    });

    void it('allows retry after error with coalescing', async () => {
      const mutex = Mutex.create(coalescingConfig);
      let callCount = 0;

      const operation = async (): Promise<string> => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call fails');
        }

        return 'success';
      };

      try {
        await mutex.runExclusive('key1', operation);
        throw new Error('Should have thrown');
      } catch {
        // Expected
      }

      const result = await mutex.runExclusive('key1', operation);

      strictEqual(result, 'success');
      strictEqual(callCount, 2);
    });
  });

  void describe('Stats Tracking', () => {
    void it('tracks coalescedCount in stats', async () => {
      const mutex = Mutex.create(coalescingConfig);

      const operation = async (): Promise<string> => {
        await delay(50);

        return 'result';
      };

      const statsBefore = mutex.getStats();

      strictEqual(statsBefore.coalescedCount, 0);

      await Promise.all([
        mutex.runExclusive('key1', operation),
        mutex.runExclusive('key1', operation),
        mutex.runExclusive('key1', operation)
      ]);

      const statsAfter = mutex.getStats();

      strictEqual(statsAfter.coalescedCount, 2, 'Two calls should be coalesced');
      strictEqual(statsAfter.totalExecuted, 1, 'Only one execution');
    });

    void it('does not increment coalescedCount when coalescing is disabled', async () => {
      const mutex = Mutex.create({ enableCoalescing: false });

      const operation = async (): Promise<string> => {
        await delay(10);

        return 'result';
      };

      await Promise.all([
        mutex.runExclusive('key1', operation),
        mutex.runExclusive('key1', operation)
      ]);

      const stats = mutex.getStats();

      strictEqual(stats.coalescedCount, 0);
      strictEqual(stats.totalExecuted, 2);
    });
  });

  void describe('Coalescing stats', () => {
    void it('coalescedCount increments for each joined request', async () => {
      const mutex = Mutex.create(coalescingConfig);

      const operation = async (): Promise<string> => {
        await delay(50);

        return 'result';
      };

      await Promise.all([
        mutex.runExclusive('key1', operation),
        mutex.runExclusive('key1', operation),
        mutex.runExclusive('key1', operation)
      ]);

      strictEqual(mutex.getStats().coalescedCount, 2, 'Two callers joined the in-flight operation');
    });

    void it('coalescedCount does not increment when coalescing is disabled', async () => {
      const mutex = Mutex.create({ enableCoalescing: false });

      const operation = async (): Promise<string> => {
        await delay(10);

        return 'result';
      };

      await Promise.all([
        mutex.runExclusive('key1', operation),
        mutex.runExclusive('key1', operation)
      ]);

      strictEqual(mutex.getStats().coalescedCount, 0);
    });

    void it('builder creates a coalescing mutex that tracks coalesced calls', async () => {
      const mutex = new MutexBuilder<string>()
        .withCoalescing(true)
        .build();

      const operation = async (): Promise<string> => {
        await delay(50);

        return 'result';
      };

      await Promise.all([
        mutex.runExclusive('key1', operation),
        mutex.runExclusive('key1', operation)
      ]);

      strictEqual(mutex.getStats().coalescedCount, 1);
    });
  });

  void describe('Clear with Coalescing', () => {
    void it('allows new operations after clear() is called', async () => {
      const mutex = Mutex.create(coalescingConfig);

      const result1 = await mutex.runExclusive('key1', async () => {
        await delay(10);

        return 'first-result';
      });

      strictEqual(result1, 'first-result');

      mutex.clear();

      const result2 = await mutex.runExclusive('key1', async () => {
        return 'new-result';
      });

      strictEqual(result2, 'new-result');
    });

    void it('resets coalescing state after clear', async () => {
      const mutex = Mutex.create(coalescingConfig);
      let executionCount = 0;

      const operation1 = async (): Promise<string> => {
        executionCount++;
        await delay(30);

        return 'result';
      };

      await Promise.all([
        mutex.runExclusive('key1', operation1),
        mutex.runExclusive('key1', operation1)
      ]);

      strictEqual(executionCount, 1, 'First batch should execute once');

      mutex.clear();

      const operation2 = async (): Promise<string> => {
        executionCount++;
        await delay(30);

        return 'result2';
      };

      await Promise.all([
        mutex.runExclusive('key1', operation2),
        mutex.runExclusive('key1', operation2)
      ]);

      strictEqual(executionCount, 2, 'Second batch should execute once more');
    });
  });
});
