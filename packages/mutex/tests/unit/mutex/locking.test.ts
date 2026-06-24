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
import { it } from 'node:test';
import {
  setTimeout as delay
} from 'node:timers/promises';

import { Mutex } from '../../../src/mutex/index.js';

// --- acquire() and release() ---

it('acquires and releases lock', async () => {
  const mutex = Mutex.create();
  const release = await mutex.acquire('key1');

  ok(mutex.isLocked('key1'), 'Key should be locked');

  release();
  await delay(10);

  ok(!mutex.isLocked('key1'), 'Key should be unlocked after release');
});

it('handles multiple sequential acquisitions', async () => {
  const mutex = Mutex.create();
  const release1 = await mutex.acquire('key1');

  ok(mutex.isLocked('key1'));
  release1();
  await delay(10);

  const release2 = await mutex.acquire('key1');

  ok(mutex.isLocked('key1'));
  release2();
});

it('distinguishes between different keys', async () => {
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

// --- runExclusive() return values ---

const syncReturnScenarios: Array<{
  description: string;
  fn: () => unknown;
  expected: unknown;
}> = [
  {
    description: 'runExclusive returns value from sync function returning string',
    fn: () => 'sync-result',
    expected: 'sync-result'
  },
  {
    description: 'runExclusive returns value from sync function returning number',
    fn: () => 100,
    expected: 100
  }
];

for (const { description, fn, expected } of syncReturnScenarios) {
  it(description, async () => {
    const mutex = Mutex.create();
    const result = await mutex.runExclusive('key1', fn);

    strictEqual(result, expected);
  });
}

it('executes async function with exclusive access', async () => {
  const mutex = Mutex.create();

  const result = await mutex.runExclusive('key1', async () => {
    ok(mutex.isLocked('key1'), 'Key should be locked during execution');

    return 42;
  });

  strictEqual(result, 42);
  await delay(10);
  ok(!mutex.isLocked('key1'), 'Key should be unlocked after execution');
});

it('returns value from async function', async () => {
  const mutex = Mutex.create();
  const result = await mutex.runExclusive('key1', async () => {
    await delay(5);

    return 'async-result';
  });

  strictEqual(result, 'async-result');
});

it('releases lock even if function throws', async () => {
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

it('handles multiple sequential operations', async () => {
  const mutex = Mutex.create();
  const results: string[] = [];

  await mutex.runExclusive('key1', async () => { results.push('first'); });
  await mutex.runExclusive('key1', async () => { results.push('second'); });
  await mutex.runExclusive('key1', async () => { results.push('third'); });

  deepStrictEqual(results, ['first', 'second', 'third']);
});
