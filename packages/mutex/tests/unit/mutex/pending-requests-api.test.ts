/**
 * Mutex Pending Requests API Unit Tests
 *
 * Tests the pending requests API: getStats(), isComplete(), completeQueue()
 * These methods provide consistent observability across throttle/mutex libraries
 */

import {
  deepStrictEqual, ok, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';
import {
  setTimeout as delay
} from 'node:timers/promises';

import { Mutex } from '../../../src/mutex/index.js';

// --- getStats() initial state ---

it('getStats returns correct initial stats', () => {
  const mutex = new Mutex<string>({ maxQueueSize: 100, timeout: 5000 });
  const stats = mutex.getStats();

  strictEqual(stats.activeLocksCount, 0, 'Should have no active locks initially');
  strictEqual(stats.queuedCount, 0, 'Should have no queued operations initially');
  strictEqual(stats.totalExecuted, 0, 'Should have executed nothing initially');
  strictEqual(stats.maxQueueSize, 100, 'Should match config');
  strictEqual(stats.timeout, 5000, 'Should match config');
});

// --- getStats() API shape ---

it('provides same API shape as Throttle', () => {
  const mutex = new Mutex<string>();

  strictEqual(typeof mutex.getStats, 'function', 'Should have getStats method');
  strictEqual(typeof mutex.isComplete, 'function', 'Should have isComplete method');
  strictEqual(typeof mutex.completeQueue, 'function', 'Should have completeQueue method');

  const stats = mutex.getStats();

  strictEqual(typeof stats, 'object', 'Stats should be an object');
  ok('activeLocksCount' in stats, 'Should have activeLocksCount');
  ok('queuedCount' in stats, 'Should have queuedCount');
  ok('totalExecuted' in stats, 'Should have totalExecuted');
  ok('maxQueueSize' in stats, 'Should have maxQueueSize');
  ok('timeout' in stats, 'Should have timeout');
});

// --- getStats() tracking active locks ---

it('getStats tracks active locks', async () => {
  const mutex = new Mutex<string>();
  const release = await mutex.acquire('key1');
  const stats = mutex.getStats();

  strictEqual(stats.activeLocksCount, 1, 'Should have 1 active lock');
  strictEqual(stats.totalExecuted, 1, 'Should have executed 1 operation');

  release();
});

it('getStats tracks multiple active locks on different keys', async () => {
  const mutex = new Mutex<string>();
  const release1 = await mutex.acquire('key1');
  const release2 = await mutex.acquire('key2');
  const release3 = await mutex.acquire('key3');

  const stats = mutex.getStats();

  strictEqual(stats.activeLocksCount, 3, 'Should have 3 active locks');
  strictEqual(stats.queuedCount, 0, 'Should have no queued operations');
  strictEqual(stats.totalExecuted, 3, 'Should have executed 3 operations');

  release1();
  release2();
  release3();
});

it('getStats tracks queued operations', async () => {
  const mutex = new Mutex<string>();
  const release1 = await mutex.acquire('key1');

  void mutex.runExclusive('key1', async () => { await delay(5); });
  void mutex.runExclusive('key1', async () => { await delay(5); });
  void mutex.runExclusive('key1', async () => { await delay(5); });

  await delay(10);

  const stats = mutex.getStats();

  strictEqual(stats.activeLocksCount, 1, 'Should have 1 active lock');
  strictEqual(stats.queuedCount, 3, 'Should have 3 queued operations');
  strictEqual(stats.totalExecuted, 1, 'Should have executed 1 operation');

  release1();
  await mutex.completeQueue();
});

it('getStats tracks queued operations across multiple keys', async () => {
  const mutex = new Mutex<string>();
  const release1 = await mutex.acquire('key1');
  const release2 = await mutex.acquire('key2');

  void mutex.runExclusive('key1', async () => { await delay(5); });
  void mutex.runExclusive('key1', async () => { await delay(5); });
  void mutex.runExclusive('key2', async () => { await delay(5); });

  await delay(10);

  const stats = mutex.getStats();

  strictEqual(stats.activeLocksCount, 2, 'Should have 2 active locks');
  strictEqual(stats.queuedCount, 3, 'Should have 3 queued operations total');
  strictEqual(stats.totalExecuted, 2, 'Should have executed 2 operations');

  release1();
  release2();
  await mutex.completeQueue();
});

it('getStats increments totalExecuted correctly', async () => {
  const mutex = new Mutex<string>();

  await mutex.runExclusive('key1', async () => { /* empty */ });
  await mutex.runExclusive('key2', async () => { /* empty */ });
  await mutex.runExclusive('key1', async () => { /* empty */ });

  const stats = mutex.getStats();

  strictEqual(stats.totalExecuted, 3, 'Should have executed 3 operations');
  strictEqual(stats.activeLocksCount, 0, 'Should have no active locks');
  strictEqual(stats.queuedCount, 0, 'Should have no queued operations');
});

// --- isComplete() ---

const isCompleteInitialScenarios: Array<{
  description: string;
  check: () => boolean;
  expected: boolean;
}> = [
  {
    description: 'isComplete returns true initially',
    check: () => new Mutex<string>().isComplete(),
    expected: true
  }
];

for (const { description, check, expected } of isCompleteInitialScenarios) {
  it(description, () => {
    strictEqual(check(), expected);
  });
}

it('isComplete returns false when lock is held', async () => {
  const mutex = new Mutex<string>();
  const release = await mutex.acquire('key1');

  strictEqual(mutex.isComplete(), false, 'Should not be complete with active lock');

  release();
});

it('isComplete returns true after lock is released', async () => {
  const mutex = new Mutex<string>();
  const release = await mutex.acquire('key1');

  release();
  await delay(5);

  strictEqual(mutex.isComplete(), true, 'Should be complete after release');
});

it('isComplete returns false when operations are queued', async () => {
  const mutex = new Mutex<string>();
  const release1 = await mutex.acquire('key1');

  void mutex.runExclusive('key1', async () => { await delay(5); });

  await delay(10);

  strictEqual(mutex.isComplete(), false, 'Should not be complete with queued operations');

  release1();
  await mutex.completeQueue();
});

it('isComplete returns false with multiple active locks', async () => {
  const mutex = new Mutex<string>();
  const release1 = await mutex.acquire('key1');
  const release2 = await mutex.acquire('key2');

  strictEqual(mutex.isComplete(), false, 'Should not be complete with multiple locks');

  release1();
  release2();
});

// --- completeQueue() ---

it('completeQueue resolves immediately when already complete', async () => {
  const mutex = new Mutex<string>();

  await mutex.completeQueue();

  strictEqual(mutex.isComplete(), true, 'Should be complete');
});

it('completeQueue waits for active lock to be released', async () => {
  const mutex = new Mutex<string>();
  let lockReleased = false;

  void mutex.runExclusive('key1', async () => {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        lockReleased = true;
        resolve();
      }, 50);
    });
  });

  await delay(10);
  strictEqual(lockReleased, false, 'Lock should not be released yet');

  await mutex.completeQueue();

  strictEqual(lockReleased, true, 'Lock should be released after completeQueue');
  strictEqual(mutex.isComplete(), true, 'Should be complete');
});

it('completeQueue waits for queued operations to complete', async () => {
  const mutex = new Mutex<string>();
  const completed: number[] = [];

  void mutex.runExclusive('key1', async () => {
    await new Promise<void>((resolve) => { setTimeout(() => { completed.push(1); resolve(); }, 20); });
  });
  void mutex.runExclusive('key1', async () => {
    await new Promise<void>((resolve) => { setTimeout(() => { completed.push(2); resolve(); }, 20); });
  });
  void mutex.runExclusive('key1', async () => {
    await new Promise<void>((resolve) => { setTimeout(() => { completed.push(3); resolve(); }, 20); });
  });

  await delay(10);
  strictEqual(completed.length, 0, 'No operations should be complete yet');

  await mutex.completeQueue();

  strictEqual(completed.length, 3, 'All operations should be complete');
  deepStrictEqual(completed, [1, 2, 3], 'Operations should complete in order');
  strictEqual(mutex.isComplete(), true, 'Should be complete');
});

it('completeQueue waits for multiple keys to complete', async () => {
  const mutex = new Mutex<string>();
  const completed: string[] = [];

  void mutex.runExclusive('key1', async () => {
    await new Promise<void>((resolve) => { setTimeout(() => { completed.push('key1'); resolve(); }, 30); });
  });
  void mutex.runExclusive('key2', async () => {
    await new Promise<void>((resolve) => { setTimeout(() => { completed.push('key2'); resolve(); }, 20); });
  });
  void mutex.runExclusive('key3', async () => {
    await new Promise<void>((resolve) => { setTimeout(() => { completed.push('key3'); resolve(); }, 10); });
  });

  await delay(5);
  strictEqual(completed.length, 0, 'No operations should be complete yet');

  await mutex.completeQueue();

  strictEqual(completed.length, 3, 'All operations should be complete');
  strictEqual(mutex.isComplete(), true, 'Should be complete');
});

it('completeQueue supports multiple observers', async () => {
  const mutex = new Mutex<string>();
  let observer1Notified = false;
  let observer2Notified = false;
  let observer3Notified = false;

  void mutex.runExclusive('key1', async () => { await delay(50); });

  await delay(10);

  void mutex.completeQueue().then(() => { observer1Notified = true; });
  void mutex.completeQueue().then(() => { observer2Notified = true; });
  void mutex.completeQueue().then(() => { observer3Notified = true; });

  await mutex.completeQueue();

  strictEqual(observer1Notified, true, 'Observer 1 should be notified');
  strictEqual(observer2Notified, true, 'Observer 2 should be notified');
  strictEqual(observer3Notified, true, 'Observer 3 should be notified');
  strictEqual(mutex.isComplete(), true, 'Should be complete');
});
