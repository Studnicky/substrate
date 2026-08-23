import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import type { MutexConfigEntity } from '../../../src/entities/MutexConfigEntity.js';
import { LockTimeoutError } from '../../../src/errors/index.js';
import { configInternal, Mutex } from '../../../src/mutex/index.js';
import scenarioGroups from './mutex-core.scenarios.json' with { type: 'json' };

type BatchInput = {
  acquireCount?: number;
  observerCount?: number;
  operationCount?: number;
  overflowCount?: number;
  queuedCount?: number;
  queuedPerKey?: Record<string, number>;
};

type MutexScenarioInput = Record<string, unknown> & {
  batch?: BatchInput;
  delayMs?: number;
  delaysMs?: number[];
  errorMessage?: string;
  key?: unknown;
  keys?: string[];
  mutex?: Record<string, unknown>;
  operations?: string[];
  result?: unknown;
  value?: unknown;
};

type ScenarioData = {
  description: string;
  expected: Record<string, unknown>;
  input: MutexScenarioInput;
  name: string;
};

type ScenarioShape =
  | 'acquire-disposable'
  | 'acquire-release'
  | 'async-exclusive'
  | 'async-return-value'
  | 'burst-timeout-drains-queue'
  | 'clear-clears-all'
  | 'clear-empty'
  | 'clear-rejects-queued-acquisitions'
  | 'completeQueue-immediate'
  | 'completeQueue-multiple-observers'
  | 'completeQueue-waits-active'
  | 'completeQueue-waits-multi-key'
  | 'completeQueue-waits-queued'
  | 'config-defaults'
  | 'config-empty'
  | 'config-enable-coalescing'
  | 'config-external-modification'
  | 'config-full'
  | 'config-invalid-enableCoalescing'
  | 'config-invalid-maxQueue-float'
  | 'config-invalid-maxQueue-negative'
  | 'config-invalid-timeout-float'
  | 'config-invalid-timeout-negative'
  | 'config-no-limits'
  | 'config-partial-maxQueue-5'
  | 'config-partial-maxQueue-50'
  | 'config-partial-timeout'
  | 'config-return-copy'
  | 'config-unknown-key'
  | 'create-composite-key'
  | 'create-functional'
  | 'create-no-config'
  | 'create-number-key'
  | 'create-partial-config'
  | 'create-string-key'
  | 'different-keys'
  | 'getConfig-current'
  | 'getConfig-default'
  | 'isComplete-after-release-true'
  | 'isComplete-held-false'
  | 'isComplete-initial-true'
  | 'isComplete-multi-active-false'
  | 'isComplete-queued-false'
  | 'isLocked-after-release'
  | 'isLocked-initial-false'
  | 'isLocked-multiple-keys'
  | 'isLocked-true'
  | 'multiple-operations'
  | 'queue-size-exceeded'
  | 'queueSize-decrements'
  | 'queueSize-held-empty'
  | 'queueSize-initial-zero'
  | 'queueSize-tracks-queued'
  | 'queued-timeout-unlinks-middle-node'
  | 'releases-on-throw'
  | 'result-validator-rejects'
  | 'sequential-acquisitions'
  | 'size-active-locks'
  | 'size-initial-zero'
  | 'size-no-queued'
  | 'stats-active-locks'
  | 'stats-api-shape'
  | 'stats-initial'
  | 'stats-multiple-active'
  | 'stats-queued'
  | 'stats-queued-multi-key'
  | 'stats-total-executed'
  | 'sync-return-number'
  | 'sync-return-string'
  | 'validateConfig-invalid'
  | 'validateConfig-valid';

type ScenarioCase = ScenarioData & { shape: ScenarioShape };
type NumericBatchField = keyof Omit<BatchInput, 'queuedPerKey'>;
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;
type ReleaseFunction = () => void;

function mutexConfig(scenarioCase: ScenarioCase): Partial<MutexConfigEntity.Type> {
  return (scenarioCase.input.mutex ?? {}) as Partial<MutexConfigEntity.Type>;
}

function readBatchCount(input: MutexScenarioInput, field: NumericBatchField): number {
  const value = input.batch?.[field];
  if (typeof value !== 'number') {
    throw new Error(`Scenario input.batch.${field} must be a number`);
  }
  return value;
}

function readQueuedPerKey(input: MutexScenarioInput): Record<string, number> {
  const value = input.batch?.queuedPerKey;
  if (value === undefined) {
    throw new Error('Scenario input.batch.queuedPerKey is required');
  }
  return value;
}

function readNumber(value: unknown, label: string): number {
  if (typeof value !== 'number') {
    throw new Error(`${label} must be a number`);
  }
  return value;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

function readBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function readStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${label} must be a string array`);
  }
  return value;
}

function readNumberArray(value: unknown, label: string): number[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'number')) {
    throw new Error(`${label} must be a number array`);
  }
  return value;
}

function readStringKey(input: MutexScenarioInput): string {
  return readString(input.key, 'Scenario input.key');
}

function readNumberKey(input: MutexScenarioInput): number {
  return readNumber(input.key, 'Scenario input.key');
}

function readStringKeys(input: MutexScenarioInput): string[] {
  return readStringArray(input.keys, 'Scenario input.keys');
}

function readArrayItem<T>(items: readonly T[], index: number, label: string): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`${label} is missing item ${index}`);
  }
  return item;
}

function createAcquireBatch(
  count: number,
  acquire: () => Promise<ReleaseFunction>
): Array<Promise<ReleaseFunction>> {
  return Array.from({ length: count }, () => acquire());
}

function releaseAll(releases: Iterable<ReleaseFunction>): void {
  for (const release of releases) {
    release();
  }
}

async function releaseQueuedInOrder(acquisitions: Iterable<Promise<ReleaseFunction>>): Promise<void> {
  for (const acquisition of acquisitions) {
    const release = await acquisition;
    release();
  }
}

function assertConfigMatches(
  config: Readonly<MutexConfigEntity.Type>,
  expected: Record<string, unknown>
): void {
  if ('maximumQueueSize' in expected) {
    assert.strictEqual(config.maximumQueueSize, expected.maximumQueueSize);
  }
  if ('timeout' in expected) {
    assert.strictEqual(config.timeout, expected.timeout);
  }
  if ('enableCoalescing' in expected) {
    assert.strictEqual(config.enableCoalescing, expected.enableCoalescing);
  }
}

function assertStatsMatch(stats: Record<string, unknown>, expected: Record<string, unknown>): void {
  if ('activeLocksCount' in expected) {
    assert.strictEqual(stats.activeLocksCount, expected.activeLocksCount);
  }
  if ('queuedCount' in expected) {
    assert.strictEqual(stats.queuedCount, expected.queuedCount);
  }
  if ('totalExecuted' in expected) {
    assert.strictEqual(stats.totalExecuted, expected.totalExecuted);
  }
  if ('maximumQueueSize' in expected) {
    assert.strictEqual(stats.maximumQueueSize, expected.maximumQueueSize);
  }
  if ('timeout' in expected) {
    assert.strictEqual(stats.timeout, expected.timeout);
  }
}

const assertCreatedMutex: ScenarioRunner = (scenarioCase) => {
  const mutex = Mutex.create(mutexConfig(scenarioCase));
  assert.strictEqual(typeof mutex, 'object');
  assertConfigMatches(mutex.getConfig(), scenarioCase.expected);
};

const assertInvalidMutexConfig: ScenarioRunner = (scenarioCase) => {
  assert.throws(() => { Mutex.create(mutexConfig(scenarioCase)); });
};

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'acquire-disposable': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = Mutex.create();
    const lock = await mutex.acquireDisposable(key);
    assert.strictEqual(lock.key, key);
    assert.ok(mutex.isLocked(key));
    await lock[Symbol.asyncDispose]();
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.locked ?? false);
  },
  'acquire-release': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = Mutex.create();
    const release = await mutex.acquire(key);
    assert.ok(mutex.isLocked(key));
    release();
    await delay(10);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.locked);
  },
  'async-exclusive': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = Mutex.create();
    const result = await mutex.runExclusive(key, async () => {
      assert.ok(mutex.isLocked(key));
      await delay(readNumber(scenarioCase.input.delayMs, 'Scenario input.delayMs'));
      return true;
    });
    assert.strictEqual(result, scenarioCase.expected.exclusive);
    await delay(10);
    assert.ok(!mutex.isLocked(key));
  },
  'async-return-value': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = Mutex.create();
    const result = await mutex.runExclusive(key, async () => {
      await delay(5);
      return scenarioCase.input.result;
    });
    assert.strictEqual(result, scenarioCase.expected.result);
  },
  'burst-timeout-drains-queue': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const queuedCount = readBatchCount(scenarioCase.input, 'queuedCount');
    const mutex = Mutex.create(mutexConfig(scenarioCase));
    await mutex.acquire(key);
    const acquisitions = createAcquireBatch(queuedCount, () => mutex.acquire(key));
    const drainOrder: number[] = [];
    acquisitions.forEach((acquisition, index) => {
      void acquisition.catch(() => { drainOrder.push(index + 1); });
    });
    for (const acquisition of acquisitions) {
      await assert.rejects(acquisition, LockTimeoutError);
    }
    assert.strictEqual(mutex.queueSize(key), 0);
    assert.strictEqual(acquisitions.length, scenarioCase.expected.rejects);
    assert.deepStrictEqual(drainOrder, readNumberArray(scenarioCase.expected.drainOrder, 'Scenario expected.drainOrder'));
    assert.ok(!mutex.isComplete());
  },
  'clear-clears-all': async (scenarioCase) => {
    const keys = readStringKeys(scenarioCase.input);
    const mutex = Mutex.create();
    for (const key of keys) {
      await mutex.acquire(key);
    }
    assert.strictEqual(mutex.size(), keys.length);
    mutex.clear();
    assert.strictEqual(mutex.size(), scenarioCase.expected.sizeAfterClear);
    for (const key of keys) {
      assert.ok(!mutex.isLocked(key));
    }
  },
  'clear-empty': (scenarioCase) => {
    const mutex = Mutex.create();
    mutex.clear();
    assert.strictEqual(mutex.size(), scenarioCase.expected.sizeAfterClear);
  },
  'clear-rejects-queued-acquisitions': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const queuedCount = readBatchCount(scenarioCase.input, 'queuedCount');
    const mutex = Mutex.create(mutexConfig(scenarioCase));
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(queuedCount, () => mutex.acquire(key));
    await delay(5);
    mutex.clear();
    release();
    const results = await Promise.allSettled(pending);
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    assert.strictEqual(rejected.length, scenarioCase.expected.queuedRejected);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.lockedAfterClear);
    assert.strictEqual(mutex.queueSize(key), scenarioCase.expected.queueSizeAfterClear);
  },
  'completeQueue-immediate': async (scenarioCase) => {
    const mutex = Mutex.create<string>();
    await mutex.completeQueue();
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.resolvedImmediately);
  },
  'completeQueue-multiple-observers': async (scenarioCase) => {
    const observerCount = readBatchCount(scenarioCase.input, 'observerCount');
    const mutex = Mutex.create<string>();
    const observerStates = Array.from({ length: observerCount }, () => false);
    void mutex.runExclusive(readStringKey(scenarioCase.input), async () => { await delay(50); });
    await delay(10);
    observerStates.forEach((_state, index) => {
      void mutex.completeQueue().then(() => {
        observerStates[index] = true;
      });
    });
    await mutex.completeQueue();
    assert.strictEqual(observerStates.filter(Boolean).length, scenarioCase.expected.observersNotified);
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.complete);
  },
  'completeQueue-waits-active': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = Mutex.create<string>();
    let lockReleased = false;
    void mutex.runExclusive(key, async () => {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          lockReleased = true;
          resolve();
        }, readNumber(scenarioCase.input.delayMs, 'Scenario input.delayMs'));
      });
    });
    await delay(10);
    assert.strictEqual(lockReleased, false);
    await mutex.completeQueue();
    assert.strictEqual(lockReleased, scenarioCase.expected.waitedForRelease);
    assert.strictEqual(mutex.isComplete(), true);
  },
  'completeQueue-waits-multi-key': async (scenarioCase) => {
    const keys = readStringKeys(scenarioCase.input);
    const delaysMs = readNumberArray(scenarioCase.input.delaysMs, 'Scenario input.delaysMs');
    const mutex = Mutex.create<string>();
    const completed: string[] = [];
    keys.forEach((key, index) => {
      const operationDelay = readArrayItem(delaysMs, index, 'Scenario input.delaysMs');
      void mutex.runExclusive(key, async () => {
        await delay(operationDelay);
        completed.push(key);
      });
    });
    await delay(5);
    assert.strictEqual(completed.length, 0);
    await mutex.completeQueue();
    assert.strictEqual(completed.length, scenarioCase.expected.completed);
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.waitedForAll);
  },
  'completeQueue-waits-queued': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const queuedCount = readBatchCount(scenarioCase.input, 'queuedCount');
    const operationDelay = readNumber(scenarioCase.input.delayMs, 'Scenario input.delayMs');
    const mutex = Mutex.create<string>();
    const completed: number[] = [];
    Array.from({ length: queuedCount }, (_unused, index) => {
      void mutex.runExclusive(key, async () => {
        await delay(operationDelay);
        completed.push(index + 1);
      });
    });
    await delay(10);
    assert.strictEqual(completed.length, 0);
    await mutex.completeQueue();
    assert.deepStrictEqual(completed, scenarioCase.expected.completed);
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.waitedForQueue);
  },
  'config-defaults': (scenarioCase) => {
    const mutex = Mutex.create();
    assertConfigMatches(mutex.getConfig(), scenarioCase.expected);
  },
  'config-empty': assertCreatedMutex,
  'config-enable-coalescing': assertCreatedMutex,
  'config-external-modification': (scenarioCase) => {
    const mutex = Mutex.create(mutexConfig(scenarioCase));
    const config = mutex.getConfig();
    Object.assign(config, { maximumQueueSize: 999 });
    assert.strictEqual(mutex.getConfig().maximumQueueSize, scenarioCase.expected.maximumQueueSize);
    assert.strictEqual(
      mutex.getConfig().maximumQueueSize === scenarioCase.expected.maximumQueueSize,
      scenarioCase.expected.externalMutationIgnored
    );
  },
  'config-full': assertCreatedMutex,
  'config-invalid-enableCoalescing': assertInvalidMutexConfig,
  'config-invalid-maxQueue-float': assertInvalidMutexConfig,
  'config-invalid-maxQueue-negative': assertInvalidMutexConfig,
  'config-invalid-timeout-float': assertInvalidMutexConfig,
  'config-invalid-timeout-negative': assertInvalidMutexConfig,
  'config-no-limits': async (scenarioCase) => {
    const mutex = Mutex.create(mutexConfig(scenarioCase));
    const result = await mutex.runExclusive(readStringKey(scenarioCase.input), async () => scenarioCase.input.result);
    assert.strictEqual(result, scenarioCase.expected.runExclusive);
  },
  'config-partial-maxQueue-5': assertCreatedMutex,
  'config-partial-maxQueue-50': assertCreatedMutex,
  'config-partial-timeout': assertCreatedMutex,
  'config-return-copy': (scenarioCase) => {
    const mutex = Mutex.create(mutexConfig(scenarioCase));
    const config1 = mutex.getConfig();
    const config2 = mutex.getConfig();
    assert.strictEqual(config1 === config2, scenarioCase.expected.sameRef);
    if (readBoolean(scenarioCase.expected.sameValue, 'Scenario expected.sameValue')) {
      assert.deepStrictEqual(config1, config2);
    } else {
      assert.notDeepStrictEqual(config1, config2);
    }
  },
  'config-unknown-key': assertInvalidMutexConfig,
  'create-composite-key': async (scenarioCase) => {
    const mutex = Mutex.create();
    const key = JSON.stringify(scenarioCase.input.key);
    const result = await mutex.runExclusive(key, () => scenarioCase.expected.result);
    assert.strictEqual(result, scenarioCase.expected.result);
  },
  'create-functional': async (scenarioCase) => {
    const key = readNumberKey(scenarioCase.input);
    const mutex = Mutex.create<number>();
    const release = await mutex.acquire(key);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.locked);
    release();
    assert.strictEqual(!mutex.isLocked(key), scenarioCase.expected.releaseWorks);
  },
  'create-no-config': (scenarioCase) => {
    const mutex = Mutex.create();
    assert.strictEqual(typeof mutex === 'object', scenarioCase.expected.created);
  },
  'create-number-key': async (scenarioCase) => {
    const key = readNumberKey(scenarioCase.input);
    const mutex = Mutex.create<number>();
    const result = await mutex.runExclusive(key, () => scenarioCase.expected.result);
    assert.strictEqual(result, scenarioCase.expected.result);
  },
  'create-partial-config': assertCreatedMutex,
  'create-string-key': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = Mutex.create();
    const result = await mutex.runExclusive(key, () => scenarioCase.expected.result);
    assert.strictEqual(result, scenarioCase.expected.result);
  },
  'different-keys': async (scenarioCase) => {
    const keys = readStringKeys(scenarioCase.input);
    const lockedKeys = readStringArray(scenarioCase.expected.lockedKeys, 'Scenario expected.lockedKeys');
    const mutex = Mutex.create();
    const releases = await Promise.all(keys.map((key) => mutex.acquire(key)));
    assert.deepStrictEqual(keys.filter((key) => mutex.isLocked(key)), lockedKeys);
    const firstKey = readArrayItem(keys, 0, 'Scenario input.keys');
    const secondKey = readArrayItem(keys, 1, 'Scenario input.keys');
    const firstRelease = readArrayItem(releases, 0, 'Scenario acquire releases');
    firstRelease();
    assert.strictEqual(!mutex.isLocked(firstKey) && mutex.isLocked(secondKey), scenarioCase.expected.independent);
    releaseAll(releases.slice(1));
  },
  'getConfig-current': assertCreatedMutex,
  'getConfig-default': (scenarioCase) => {
    const mutex = Mutex.create();
    assertConfigMatches(mutex.getConfig(), scenarioCase.expected);
  },
  'isComplete-after-release-true': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = Mutex.create<string>();
    const release = await mutex.acquire(key);
    release();
    await delay(5);
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.completeAfterRelease);
  },
  'isComplete-held-false': async (scenarioCase) => {
    const mutex = Mutex.create<string>();
    const release = await mutex.acquire(readStringKey(scenarioCase.input));
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.complete);
    release();
  },
  'isComplete-initial-true': (scenarioCase) => {
    assert.strictEqual(Mutex.create<string>().isComplete(), scenarioCase.expected.complete);
  },
  'isComplete-multi-active-false': async (scenarioCase) => {
    const keys = readStringKeys(scenarioCase.input);
    const mutex = Mutex.create<string>();
    const releases = await Promise.all(keys.map((key) => mutex.acquire(key)));
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.complete);
    releaseAll(releases);
  },
  'isComplete-queued-false': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const queuedCount = readBatchCount(scenarioCase.input, 'queuedCount');
    const mutex = Mutex.create<string>();
    const release = await mutex.acquire(key);
    const queued = createAcquireBatch(queuedCount, () => mutex.acquire(key));
    await delay(10);
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.complete);
    release();
    await releaseQueuedInOrder(queued);
  },
  'isLocked-after-release': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = Mutex.create();
    const release = await mutex.acquire(key);
    release();
    await delay(10);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.lockedAfterRelease);
  },
  'isLocked-initial-false': (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    assert.strictEqual(Mutex.create().isLocked(key), scenarioCase.expected.locked);
  },
  'isLocked-multiple-keys': async (scenarioCase) => {
    const keys = readStringKeys(scenarioCase.input);
    const mutex = Mutex.create();
    const releases = await Promise.all(keys.map((key) => mutex.acquire(key)));
    const firstKey = readArrayItem(keys, 0, 'Scenario input.keys');
    const secondKey = readArrayItem(keys, 1, 'Scenario input.keys');
    assert.strictEqual(mutex.isLocked(firstKey), scenarioCase.expected.first);
    assert.strictEqual(mutex.isLocked(secondKey), scenarioCase.expected.second);
    releaseAll(releases);
  },
  'isLocked-true': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = Mutex.create();
    const release = await mutex.acquire(key);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.locked);
    release();
  },
  'multiple-operations': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const operationCount = readBatchCount(scenarioCase.input, 'operationCount');
    const operations = readStringArray(scenarioCase.input.operations, 'Scenario input.operations');
    assert.strictEqual(operations.length, operationCount);
    const mutex = Mutex.create();
    const results: string[] = [];
    for (const operation of operations) {
      await mutex.runExclusive(key, async () => { results.push(operation); });
    }
    assert.deepStrictEqual(results, scenarioCase.expected.results);
    assert.strictEqual(mutex.getStats().totalExecuted, scenarioCase.expected.totalExecuted);
  },
  'queue-size-exceeded': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const queuedCount = readBatchCount(scenarioCase.input, 'queuedCount');
    const overflowCount = readBatchCount(scenarioCase.input, 'overflowCount');
    const mutex = Mutex.create(mutexConfig(scenarioCase));
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(queuedCount, () => mutex.acquire(key));
    const overflow = createAcquireBatch(overflowCount, () => mutex.acquire(key));
    for (const acquisition of overflow) {
      await assert.rejects(acquisition, { name: 'QueueSizeExceededError' });
    }
    release();
    await releaseQueuedInOrder(pending);
  },
  'queueSize-decrements': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const queuedCount = readBatchCount(scenarioCase.input, 'queuedCount');
    const expectedSizes = readNumberArray(scenarioCase.expected.queueSize, 'Scenario expected.queueSize');
    const mutex = Mutex.create(mutexConfig(scenarioCase));
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(queuedCount, () => mutex.acquire(key));
    assert.strictEqual(mutex.queueSize(key), readArrayItem(expectedSizes, 0, 'Scenario expected.queueSize'));
    release();
    for (let index = 0; index < pending.length; index++) {
      const queuedRelease = await readArrayItem(pending, index, 'Scenario pending acquisitions');
      assert.strictEqual(mutex.queueSize(key), readArrayItem(expectedSizes, index + 1, 'Scenario expected.queueSize'));
      queuedRelease();
    }
  },
  'queueSize-held-empty': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = Mutex.create();
    const release = await mutex.acquire(key);
    assert.strictEqual(mutex.queueSize(key), scenarioCase.expected.queueSize);
    release();
  },
  'queueSize-initial-zero': (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    assert.strictEqual(Mutex.create().queueSize(key), scenarioCase.expected.queueSize);
  },
  'queueSize-tracks-queued': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const queuedCount = readBatchCount(scenarioCase.input, 'queuedCount');
    const mutex = Mutex.create();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(queuedCount, () => mutex.acquire(key));
    assert.strictEqual(mutex.queueSize(key), scenarioCase.expected.queueSize);
    release();
    await releaseQueuedInOrder(pending);
  },
  'queued-timeout-unlinks-middle-node': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const queuedCount = readBatchCount(scenarioCase.input, 'queuedCount');
    const mutex = Mutex.create(mutexConfig(scenarioCase));
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(queuedCount, () => mutex.acquire(key));
    const firstQueued = readArrayItem(pending, 0, 'Scenario pending acquisitions');
    const secondQueued = readArrayItem(pending, 1, 'Scenario pending acquisitions');
    await assert.rejects(() => firstQueued, LockTimeoutError);
    assert.strictEqual(mutex.queueSize(key), scenarioCase.expected.queueSizeAfterTimeout);
    release();
    const releaseSecond = await secondQueued;
    releaseSecond();
    assert.strictEqual(mutex.queueSize(key), scenarioCase.expected.queueSizeAfterRelease);
  },
  'releases-on-throw': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const errorMessage = readString(scenarioCase.input.errorMessage, 'Scenario input.errorMessage');
    const mutex = Mutex.create();
    await assert.rejects(
      () => mutex.runExclusive(key, async () => { throw new Error(errorMessage); }),
      { message: errorMessage }
    );
    await delay(10);
    assert.strictEqual(!mutex.isLocked(key), scenarioCase.expected.released);
  },
  'sequential-acquisitions': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const acquireCount = readBatchCount(scenarioCase.input, 'acquireCount');
    const mutex = Mutex.create();
    const releaseOrder: number[] = [];
    for (let index = 0; index < acquireCount; index++) {
      const release = await mutex.acquire(key);
      assert.ok(mutex.isLocked(key));
      release();
      releaseOrder.push(index + 1);
      await delay(10);
    }
    assert.deepStrictEqual(releaseOrder, readNumberArray(scenarioCase.expected.releaseOrder, 'Scenario expected.releaseOrder'));
  },
  'size-active-locks': async (scenarioCase) => {
    const keys = readStringKeys(scenarioCase.input);
    const mutex = Mutex.create();
    const releases = await Promise.all(keys.map((key) => mutex.acquire(key)));
    assert.strictEqual(mutex.size(), scenarioCase.expected.size);
    releaseAll(releases);
  },
  'size-initial-zero': (scenarioCase) => {
    assert.strictEqual(Mutex.create().size(), scenarioCase.expected.size);
  },
  'size-no-queued': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const queuedCount = readBatchCount(scenarioCase.input, 'queuedCount');
    const mutex = Mutex.create();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(queuedCount, () => mutex.acquire(key));
    assert.strictEqual(mutex.size(), scenarioCase.expected.size);
    assert.strictEqual(
      mutex.size() === scenarioCase.expected.size && queuedCount > 0,
      scenarioCase.expected.queuedCountExcluded
    );
    release();
    await releaseQueuedInOrder(pending);
  },
  'stats-active-locks': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = Mutex.create<string>();
    const release = await mutex.acquire(key);
    assertStatsMatch(mutex.getStats(), {
      activeLocksCount: scenarioCase.expected.activeLocksCount,
      totalExecuted: 1
    });
    release();
  },
  'stats-api-shape': (scenarioCase) => {
    const mutex = Mutex.create<string>();
    assert.strictEqual(typeof mutex.getStats, 'function');
    assert.strictEqual(typeof mutex.isComplete, 'function');
    assert.strictEqual(typeof mutex.completeQueue, 'function');
    const stats = mutex.getStats();
    assert.strictEqual(typeof stats, 'object');
    assert.strictEqual('activeLocksCount' in stats, scenarioCase.expected.hasActiveLocksCount);
    assert.strictEqual('queuedCount' in stats, scenarioCase.expected.hasQueuedCount);
    assert.strictEqual('totalExecuted' in stats, scenarioCase.expected.hasTotalExecuted);
    assert.ok('maximumQueueSize' in stats);
    assert.ok('timeout' in stats);
  },
  'stats-initial': (scenarioCase) => {
    const mutex = Mutex.create<string>(mutexConfig(scenarioCase));
    assertStatsMatch(mutex.getStats(), scenarioCase.expected);
  },
  'stats-multiple-active': async (scenarioCase) => {
    const keys = readStringKeys(scenarioCase.input);
    const mutex = Mutex.create<string>();
    const releases = await Promise.all(keys.map((key) => mutex.acquire(key)));
    assertStatsMatch(mutex.getStats(), {
      activeLocksCount: scenarioCase.expected.activeLocksCount,
      queuedCount: 0,
      totalExecuted: keys.length
    });
    releaseAll(releases);
  },
  'stats-queued': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const queuedCount = readBatchCount(scenarioCase.input, 'queuedCount');
    const mutex = Mutex.create<string>();
    const release = await mutex.acquire(key);
    for (let index = 0; index < queuedCount; index++) {
      void mutex.runExclusive(key, async () => { await delay(5); });
    }
    await delay(10);
    assertStatsMatch(mutex.getStats(), {
      activeLocksCount: 1,
      queuedCount: scenarioCase.expected.queuedCount,
      totalExecuted: 1
    });
    release();
    await mutex.completeQueue();
  },
  'stats-queued-multi-key': async (scenarioCase) => {
    const keys = readStringKeys(scenarioCase.input);
    const queuedPerKey = readQueuedPerKey(scenarioCase.input);
    const mutex = Mutex.create<string>();
    const releases = await Promise.all(keys.map((key) => mutex.acquire(key)));
    for (const [key, queuedCount] of Object.entries(queuedPerKey)) {
      for (let index = 0; index < queuedCount; index++) {
        void mutex.runExclusive(key, async () => { await delay(5); });
      }
    }
    await delay(10);
    assertStatsMatch(mutex.getStats(), scenarioCase.expected);
    releaseAll(releases);
    await mutex.completeQueue();
  },
  'stats-total-executed': async (scenarioCase) => {
    const keys = readStringKeys(scenarioCase.input);
    const operationCount = readBatchCount(scenarioCase.input, 'operationCount');
    const mutex = Mutex.create<string>();
    for (let index = 0; index < operationCount; index++) {
      await mutex.runExclusive(readArrayItem(keys, index % keys.length, 'Scenario input.keys'), async () => {});
    }
    assertStatsMatch(mutex.getStats(), scenarioCase.expected);
  },
  'sync-return-number': async (scenarioCase) => {
    const mutex = Mutex.create<number>();
    const result = await mutex.runExclusive(readNumberKey(scenarioCase.input), () => scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.result);
  },
  'sync-return-string': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = Mutex.create();
    const result = await mutex.runExclusive(key, () => scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.result);
  },
  'validateConfig-invalid': (scenarioCase) => {
    assert.throws(() => { configInternal.validateConfig(mutexConfig(scenarioCase)); });
  },
  'validateConfig-valid': (scenarioCase) => {
    const config = configInternal.validateConfig(mutexConfig(scenarioCase));
    assertConfigMatches(config, scenarioCase.expected);
  },
  'result-validator-rejects': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = Mutex.create();
    await assert.rejects(
      () => mutex.runExclusive(key, () => 'value', (result): result is number => typeof result === 'number'),
      TypeError
    );
    assert.ok(!mutex.isLocked(key));
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Mutex core', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
