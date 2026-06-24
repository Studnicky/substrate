/**
 * Mutex Utility Methods Unit Tests
 *
 * Tests utility methods for inspecting mutex state:
 * - isLocked()
 * - queueSize()
 * - size()
 * - clear()
 * - getConfig()
 */

import {
  ok, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';
import {
  setTimeout as delay
} from 'node:timers/promises';

import { Mutex } from '../../../src/mutex/index.js';
import { mediumQueueConfig } from '../../fixtures/constants.js';

// --- isLocked() ---

const isLockedInitialScenarios: Array<{
  description: string;
  key: string;
}> = [
  { description: 'isLocked returns false for unlocked key', key: 'key1' }
];

for (const { description, key } of isLockedInitialScenarios) {
  it(description, () => {
    const mutex = Mutex.create();

    ok(!mutex.isLocked(key));
  });
}

it('isLocked returns true for locked key', async () => {
  const mutex = Mutex.create();
  const release = await mutex.acquire('key1');

  ok(mutex.isLocked('key1'));

  release();
});

it('isLocked returns false after lock release', async () => {
  const mutex = Mutex.create();
  const release = await mutex.acquire('key1');

  release();
  await delay(10);

  ok(!mutex.isLocked('key1'));
});

it('isLocked tracks multiple keys independently', async () => {
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

// --- queueSize() ---

const queueSizeInitialScenarios: Array<{
  description: string;
  key: string;
  expected: number;
}> = [
  { description: 'queueSize returns 0 for unlocked key', key: 'key1', expected: 0 }
];

for (const { description, key, expected } of queueSizeInitialScenarios) {
  it(description, () => {
    const mutex = Mutex.create();

    strictEqual(mutex.queueSize(key), expected);
  });
}

it('queueSize returns 0 when lock held but queue empty', async () => {
  const mutex = Mutex.create();
  const release = await mutex.acquire('key1');

  strictEqual(mutex.queueSize('key1'), 0);

  release();
});

it('queueSize tracks queued operations', async () => {
  const mutex = Mutex.create();
  const release = await mutex.acquire('key1');
  const promise1 = mutex.acquire('key1');

  strictEqual(mutex.queueSize('key1'), 1);

  const promise2 = mutex.acquire('key1');

  strictEqual(mutex.queueSize('key1'), 2);

  release();
  const release1 = await promise1;

  release1();
  const release2 = await promise2;

  release2();
});

it('queueSize decrements as queue processes', async () => {
  const mutex = Mutex.create(mediumQueueConfig);
  const release1 = await mutex.acquire('key1');
  const promise1 = mutex.acquire('key1');
  const promise2 = mutex.acquire('key1');

  strictEqual(mutex.queueSize('key1'), 2);

  release1();
  const release2 = await promise1;

  strictEqual(mutex.queueSize('key1'), 1);

  release2();
  const release3 = await promise2;

  strictEqual(mutex.queueSize('key1'), 0);

  release3();
});

// --- size() ---

const sizeInitialScenarios: Array<{
  description: string;
  expected: number;
}> = [
  { description: 'size returns 0 initially', expected: 0 }
];

for (const { description, expected } of sizeInitialScenarios) {
  it(description, () => {
    const mutex = Mutex.create();

    strictEqual(mutex.size(), expected);
  });
}

it('size returns number of active locks', async () => {
  const mutex = Mutex.create();
  const release1 = await mutex.acquire('key1');

  strictEqual(mutex.size(), 1);

  const release2 = await mutex.acquire('key2');

  strictEqual(mutex.size(), 2);

  release1();
  release2();
  await delay(10);

  strictEqual(mutex.size(), 0);
});

it('size does not count queued operations', async () => {
  const mutex = Mutex.create();
  const release1 = await mutex.acquire('key1');
  const promise1 = mutex.acquire('key1');

  strictEqual(mutex.size(), 1);

  release1();
  const release2 = await promise1;

  release2();
});

// --- clear() ---

it('clear clears all locks', async () => {
  const mutex = Mutex.create();

  await mutex.acquire('key1');
  await mutex.acquire('key2');

  strictEqual(mutex.size(), 2);

  mutex.clear();

  strictEqual(mutex.size(), 0);
  ok(!mutex.isLocked('key1'));
  ok(!mutex.isLocked('key2'));
});

it('clear clears empty mutex', () => {
  const mutex = Mutex.create();

  mutex.clear();

  strictEqual(mutex.size(), 0);
});

// --- getConfig() ---

const getConfigScenarios: Array<{
  description: string;
  build: () => Mutex<string>;
  expectedMaxQueueSize: number;
  expectedTimeout: number;
}> = [
  {
    description: 'getConfig returns current configuration',
    build: () => Mutex.create({ maxQueueSize: 100, timeout: 5000 }),
    expectedMaxQueueSize: 100,
    expectedTimeout: 5000
  },
  {
    description: 'getConfig returns default config when none provided',
    build: () => Mutex.create(),
    expectedMaxQueueSize: 0,
    expectedTimeout: 0
  }
];

for (const { description, build, expectedMaxQueueSize, expectedTimeout } of getConfigScenarios) {
  it(description, () => {
    const config = build().getConfig();

    strictEqual(config.maxQueueSize, expectedMaxQueueSize);
    strictEqual(config.timeout, expectedTimeout);
  });
}
