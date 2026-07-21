/**
 * Mutex Creation Unit Tests
 *
 * Tests direct Mutex construction.
 */

import { ok, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { Mutex } from '../../../src/mutex/index.js';
import { fullConfig } from '../../fixtures/constants.js';

const createScenarios: Array<{
  description: string;
  build: () => Mutex<string>;
  expectedMaxQueueSize: number;
  expectedTimeout: number;
}> = [
  {
    description: 'Mutex.create() creates with no config',
    build: () => Mutex.create(),
    expectedMaxQueueSize: 0,
    expectedTimeout: 0
  },
  {
    description: 'Mutex.create() creates with partial config',
    build: () => Mutex.create({ maxQueueSize: 50 }),
    expectedMaxQueueSize: 50,
    expectedTimeout: 0
  },
  {
    description: 'Mutex.create() creates with partial config (timeout only)',
    build: () => Mutex.create({ timeout: 3000 }),
    expectedMaxQueueSize: 0,
    expectedTimeout: 3000
  },
  {
    description: 'Mutex.create() creates with full config',
    build: () => Mutex.create(fullConfig),
    expectedMaxQueueSize: 100,
    expectedTimeout: 5000
  }
];

for (const { description, build, expectedMaxQueueSize, expectedTimeout } of createScenarios) {
  it(description, () => {
    const config = build().getConfig();

    strictEqual(config.maxQueueSize, expectedMaxQueueSize);
    strictEqual(config.timeout, expectedTimeout);
  });
}

it('Mutex.create() produces functional mutex', async () => {
  const mutex = Mutex.create<number>();
  const release = await mutex.acquire(42);

  ok(mutex.isLocked(42));

  release();
});

// --- Type safety ---

const keySafetyScenarios: Array<{
  description: string;
  run: () => Promise<unknown>;
  expected: unknown;
}> = [
  {
    description: 'supports string keys',
    run: async () => {
      const mutex = Mutex.create();

      return mutex.runExclusive('key1', () => 'value');
    },
    expected: 'value'
  },
  {
    description: 'supports number keys',
    run: async () => {
      const mutex = Mutex.create<number>();

      return mutex.runExclusive(42, () => 'answer');
    },
    expected: 'answer'
  },
  {
    description: 'supports composite string keys',
    run: async () => {
      const mutex = Mutex.create();
      const key = JSON.stringify({ entityType: 'User', id: '123' });

      return mutex.runExclusive(key, () => 'data');
    },
    expected: 'data'
  }
];

for (const { description, run, expected } of keySafetyScenarios) {
  it(description, async () => {
    const result = await run();

    strictEqual(result, expected);
  });
}
