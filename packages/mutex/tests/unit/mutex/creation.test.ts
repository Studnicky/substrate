/**
 * Mutex Creation Unit Tests
 *
 * Tests all methods for creating Mutex instances:
 * - Direct constructor
 * - Static create() method
 * - Builder pattern
 */

import {
  deepStrictEqual, ok, strictEqual, throws
} from 'node:assert/strict';
import { it } from 'node:test';

import {
  Mutex, MutexBuilder
} from '../../../src/mutex/index.js';
import { fullConfig } from '../../fixtures/constants.js';

// --- Constructor ---

const constructorScenarios: Array<{
  description: string;
  build: () => Mutex<string>;
  expectedMaxQueueSize: number;
  expectedTimeout: number;
}> = [
  {
    description: 'constructor creates with no config',
    build: () => new Mutex<string>(),
    expectedMaxQueueSize: 0,
    expectedTimeout: 0
  },
  {
    description: 'constructor creates with partial config',
    build: () => new Mutex<string>({ maxQueueSize: 50 }),
    expectedMaxQueueSize: 50,
    expectedTimeout: 0
  },
  {
    description: 'constructor creates with full config',
    build: () => new Mutex<string>(fullConfig),
    expectedMaxQueueSize: 100,
    expectedTimeout: 5000
  }
];

for (const { description, build, expectedMaxQueueSize, expectedTimeout } of constructorScenarios) {
  it(description, () => {
    const config = build().getConfig();

    strictEqual(config.maxQueueSize, expectedMaxQueueSize);
    strictEqual(config.timeout, expectedTimeout);
  });
}

// --- Static create() ---

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

// --- Builder pattern ---

const builderScenarios: Array<{
  description: string;
  build: () => Mutex<string>;
  expectedMaxQueueSize: number;
  expectedTimeout: number;
  expectedCoalescing?: boolean;
}> = [
  {
    description: 'builder creates with no configuration',
    build: () => new MutexBuilder<string>().build(),
    expectedMaxQueueSize: 0,
    expectedTimeout: 0
  },
  {
    description: 'builder creates with single property withMaxQueueSize',
    build: () => new MutexBuilder<string>().withMaxQueueSize(75).build(),
    expectedMaxQueueSize: 75,
    expectedTimeout: 0
  },
  {
    description: 'builder creates with chained methods',
    build: () => new MutexBuilder<string>().withMaxQueueSize(50).withTimeout(1000).build(),
    expectedMaxQueueSize: 50,
    expectedTimeout: 1000
  },
  {
    description: 'builder creates with all properties',
    build: () => new MutexBuilder<string>().withMaxQueueSize(150).withTimeout(7500).withCoalescing(true).build(),
    expectedMaxQueueSize: 150,
    expectedTimeout: 7500,
    expectedCoalescing: true
  },
  {
    description: 'builder creates with initial config',
    build: () => new MutexBuilder<string>({ maxQueueSize: 25, timeout: 1000 }).build(),
    expectedMaxQueueSize: 25,
    expectedTimeout: 1000
  }
];

for (const { description, build, expectedMaxQueueSize, expectedTimeout, expectedCoalescing } of builderScenarios) {
  it(description, () => {
    const config = build().getConfig();

    strictEqual(config.maxQueueSize, expectedMaxQueueSize);
    strictEqual(config.timeout, expectedTimeout);
    if (expectedCoalescing !== undefined) {
      strictEqual(config.enableCoalescing, expectedCoalescing);
    }
  });
}

it('builder creates functional mutex', async () => {
  const mutex = new MutexBuilder<string>()
    .withMaxQueueSize(10)
    .withTimeout(5000)
    .build();

  const result = await mutex.runExclusive('key1', async () => 'success');

  strictEqual(result, 'success');
});

it('builder validates configuration on build', () => {
  throws(
    () => { new MutexBuilder<string>().withMaxQueueSize(-1).build(); },
    (error: Error) => error.message.includes('maxQueueSize')
  );
});

// --- Equivalence ---

it('Mutex.create() and builder produce equivalent configs', () => {
  const mutex1 = Mutex.create(fullConfig);
  const mutex2 = new MutexBuilder<string>().withMaxQueueSize(100).withTimeout(5000).build();

  deepStrictEqual(mutex1.getConfig(), mutex2.getConfig());
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
