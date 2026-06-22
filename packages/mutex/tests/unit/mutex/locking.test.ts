/**
 * Mutex Locking Unit Tests
 *
 * Tests lock acquisition and release behavior:
 * - Manual acquire/release pattern
 * - runExclusive with async and sync functions
 * - Error handling and lock cleanup
 */

import {
  deepStrictEqual, ok, rejects, strictEqual
} from 'node:assert/strict';
import {
  describe, it
} from 'node:test';
import {
  setTimeout as delay
} from 'node:timers/promises';

import { Mutex } from '../../../src/mutex/index.js';

void describe('Mutex Lock Acquisition and Release', () => {
  void describe('acquire() and release()', () => {
    void it('acquires and releases lock', async () => {
      const mutex = Mutex.create();

      const release = await mutex.acquire('key1');

      ok(mutex.isLocked('key1'), 'Key should be locked');

      release();

      await delay(10);

      ok(!mutex.isLocked('key1'), 'Key should be unlocked after release');
    });

    void it('handles multiple sequential acquisitions', async () => {
      const mutex = Mutex.create();

      const release1 = await mutex.acquire('key1');

      ok(mutex.isLocked('key1'));
      release1();

      await delay(10);

      const release2 = await mutex.acquire('key1');

      ok(mutex.isLocked('key1'));
      release2();
    });

    void it('distinguishes between different keys', async () => {
      const mutex = Mutex.create();

      const release1 = await mutex.acquire('key1');

      ok(mutex.isLocked('key1'));
      ok(!mutex.isLocked('key2'));

      const release2 = await mutex.acquire('key2');

      ok(mutex.isLocked('key1'));
      ok(mutex.isLocked('key2'));

      release1();
      release2();
    });
  });

  void describe('runExclusive()', () => {
    void it('executes async function with exclusive access', async () => {
      const mutex = Mutex.create();

      const result = await mutex.runExclusive('key1', async () => {
        ok(mutex.isLocked('key1'), 'Key should be locked during execution');

        return 42;
      });

      strictEqual(result, 42);

      await delay(10);

      ok(!mutex.isLocked('key1'), 'Key should be unlocked after execution');
    });

    void it('executes sync function with exclusive access', async () => {
      const mutex = Mutex.create();

      const result = await mutex.runExclusive('key1', () => {
        return 'sync-result';
      });

      strictEqual(result, 'sync-result');
    });

    void it('returns value from async function', async () => {
      const mutex = Mutex.create();

      const result = await mutex.runExclusive('key1', async () => {
        await delay(5);

        return 'async-result';
      });

      strictEqual(result, 'async-result');
    });

    void it('returns value from sync function', async () => {
      const mutex = Mutex.create();

      const result = await mutex.runExclusive('key1', () => {
        return 100;
      });

      strictEqual(result, 100);
    });

    void it('releases lock even if function throws', async () => {
      const mutex = Mutex.create();

      await rejects(
        async () => {
          await mutex.runExclusive('key1', async () => {
            throw new Error('Test error');
          });
        },
        { message: 'Test error' }
      );

      await delay(10);

      ok(!mutex.isLocked('key1'), 'Key should be unlocked after error');
    });

    void it('handles multiple sequential operations', async () => {
      const mutex = Mutex.create();
      const results: string[] = [];

      await mutex.runExclusive('key1', async () => {
        results.push('first');
      });

      await mutex.runExclusive('key1', async () => {
        results.push('second');
      });

      await mutex.runExclusive('key1', async () => {
        results.push('third');
      });

      deepStrictEqual(results, [
        'first',
        'second',
        'third'
      ]);
    });
  });
});
