/**
 * Mutex Basic Functionality Tests
 *
 * Tests that Mutex works correctly without any observability injected.
 */

import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import {
  Mutex, MutexBuilder
} from '../../../src/mutex/index.js';

// --- Constructor ---

const constructorScenarios: Array<{
  description: string;
  build: () => Mutex<string>;
  expectedMaxQueueSize?: number;
}> = [
  {
    description: 'creates mutex without configuration',
    build: () => new Mutex<string>()
  },
  {
    description: 'creates mutex with partial configuration',
    build: () => new Mutex<string>({ maxQueueSize: 50 }),
    expectedMaxQueueSize: 50
  }
];

for (const { description, build, expectedMaxQueueSize } of constructorScenarios) {
  it(description, () => {
    const mutex = build();

    strictEqual(typeof mutex, 'object', 'Mutex should be created');
    if (expectedMaxQueueSize !== undefined) {
      strictEqual(mutex.getConfig().maxQueueSize, expectedMaxQueueSize);
    }
  });
}

// --- Static create() ---

it('Mutex.create() creates mutex without arguments', () => {
  const mutex = Mutex.create();

  strictEqual(typeof mutex, 'object', 'Mutex should be created');
});

it('Mutex.create() acquires and releases lock', async () => {
  const mutex = Mutex.create<string>();
  const release = await mutex.acquire('testKey');

  strictEqual(mutex.isLocked('testKey'), true);

  release();
  strictEqual(mutex.isLocked('testKey'), false);
});

it('Mutex.create() runs exclusive operation', async () => {
  const mutex = Mutex.create<string>();
  let executed = false;

  await mutex.runExclusive('testKey', async () => {
    executed = true;
  });

  strictEqual(executed, true);
});

it('Mutex.create() serializes concurrent operations on the same key', async () => {
  const mutex = Mutex.create<string>();
  const order: number[] = [];

  const op1 = mutex.runExclusive('key', async () => {
    order.push(1);
    await new Promise<void>((resolve) => { setTimeout(resolve, 20); });
    order.push(2);
  });

  const op2 = mutex.runExclusive('key', async () => {
    order.push(3);
  });

  await Promise.all([op1, op2]);

  strictEqual(order[0], 1);
  strictEqual(order[1], 2);
  strictEqual(order[2], 3);
});

// --- Builder ---

const builderScenarios: Array<{
  description: string;
  build: () => Mutex<string>;
  expectedMaxQueueSize?: number;
  expectedTimeout?: number;
}> = [
  {
    description: 'builder creates mutex with default settings',
    build: () => new MutexBuilder<string>().build()
  },
  {
    description: 'builder creates mutex with explicit configuration',
    build: () => new MutexBuilder<string>().withMaxQueueSize(10).withTimeout(1000).build(),
    expectedMaxQueueSize: 10,
    expectedTimeout: 1000
  }
];

for (const { description, build, expectedMaxQueueSize, expectedTimeout } of builderScenarios) {
  it(description, () => {
    const mutex = build();

    strictEqual(typeof mutex, 'object', 'Mutex should be created');
    if (expectedMaxQueueSize !== undefined) {
      strictEqual(mutex.getConfig().maxQueueSize, expectedMaxQueueSize);
    }
    if (expectedTimeout !== undefined) {
      strictEqual(mutex.getConfig().timeout, expectedTimeout);
    }
  });
}

it('builder-created mutex acquires and releases lock', async () => {
  const mutex = new MutexBuilder<string>().build();
  const release = await mutex.acquire('key1');

  strictEqual(mutex.isLocked('key1'), true);

  release();
  strictEqual(mutex.isLocked('key1'), false);
});
