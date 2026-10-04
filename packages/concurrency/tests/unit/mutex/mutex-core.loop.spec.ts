import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { setTimeout } from 'node:timers/promises';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { MutexConfigEntity } from '../../../src/entities/MutexConfigEntity.js';

import { ScenarioSuite, ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { LockTimeoutError } from '../../../src/errors/index.js';
import { Mutex } from '../../../src/mutex/Mutex.js';
import { MutexCoreScenarioCaseEntity } from './entities/MutexCoreScenarioCaseEntity.js';
import scenarioGroups from './mutex-core.scenarios.json' with { 'type': 'json' };
import { MutexCoreConfigurationRunners } from './MutexCoreConfigurationRunners.js';
import { MutexCoreTestSupport } from './MutexCoreTestSupport.js';

class HookReentrantMutex extends Mutex<string> {
  static build(): HookReentrantMutex {
    const mutex = new HookReentrantMutex();
    return mutex;
  }
  staleRelease: (() => void) | undefined;

  get lifecycleHookErrorCount(): number {
    const result = this.hooks.hookErrorCount;
    return result;
  }

  protected override afterRelease(): void {
    this.staleRelease?.();
  }
}

class MutexCoreRunners extends MutexCoreConfigurationRunners {
  static async 'acquire-disposable'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'acquire-disposable'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    const lock = await mutex.acquireDisposable(key);
    assert.strictEqual(lock.key, key);
    assert.ok(mutex.isLocked(key));
    await lock[Symbol.asyncDispose]();
    assert.strictEqual(mutex.isLocked(key), false);
  }

  static async 'acquire-release'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'acquire-release'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    const release = await mutex.acquire(key);
    assert.ok(mutex.isLocked(key));
    release();
    await setTimeout(10);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.locked);
  }

  static async 'async-exclusive'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'async-exclusive'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    const result = await mutex.runExclusive(key, async () => {
      assert.ok(mutex.isLocked(key));
      await setTimeout(ScenarioValues.requireNumber(scenarioCase.input.delayMs, 'input.delayMs'));
      return true;
    });
    assert.strictEqual(result, scenarioCase.expected.exclusive);
    await setTimeout(10);
    assert.ok(mutex.isLocked(key) === false);
  }

  static async 'async-return-value'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'async-return-value'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    const result = await mutex.runExclusive(key, async () => {
      await setTimeout(5);
      return scenarioCase.input.result;
    });
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static async 'burst-timeout-drains-queue'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'burst-timeout-drains-queue'
    >
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex));
    await mutex.acquire(key);
    const acquisitions = MutexCoreTestSupport.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'queuedCount'),
        'input.batch.queuedCount'
      )
    );
    const drainOrder: number[] = [];
    for (let index = 0; index < acquisitions.length; index += 1) {
      const acquisition = ScenarioValues.requireDefined(acquisitions[index], 'acquisitions[index]');
      void acquisition.catch(() => {
        drainOrder.push(index + 1);
      });
    }
    for (let index = 0; index < acquisitions.length; index += 1) {
      await assert.rejects(
        ScenarioValues.requireDefined(acquisitions[index], 'acquisitions[index]'),
        LockTimeoutError
      );
    }
    assert.strictEqual(mutex.queueSize(key), 0);
    assert.strictEqual(acquisitions.length, scenarioCase.expected.rejects);
    assert.deepStrictEqual(drainOrder, scenarioCase.expected.drainOrder);
    assert.ok(mutex.isComplete() === false);
  }

  static async 'clear-clears-all'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'clear-clears-all'>
  ): Promise<void> {
    const keys = ScenarioValues.requireStringArray(scenarioCase.input.keys, 'input.keys');
    const mutex = Mutex.create();
    for (let index = 0; index < keys.length; index += 1) {
      await mutex.acquire(ScenarioValues.requireDefined(keys[index], 'keys[index]'));
    }
    assert.strictEqual(mutex.size(), keys.length);
    mutex.clear();
    assert.strictEqual(mutex.size(), scenarioCase.expected.sizeAfterClear);
    for (let index = 0; index < keys.length; index += 1) {
      assert.ok(
        mutex.isLocked(ScenarioValues.requireDefined(keys[index], 'keys[index]')) === false
      );
    }
  }

  static 'clear-empty'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'clear-empty'>
  ): void {
    const mutex = Mutex.create();
    mutex.clear();
    assert.strictEqual(mutex.size(), scenarioCase.expected.sizeAfterClear);
  }

  static async 'clear-rejects-queued-acquisitions'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'clear-rejects-queued-acquisitions'
    >
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex));
    const release = await mutex.acquire(key);
    const pending = MutexCoreTestSupport.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'queuedCount'),
        'input.batch.queuedCount'
      )
    );
    await setTimeout(5);
    mutex.clear();
    release();
    const results = await Promise.allSettled(pending);
    let rejectedCount = 0;
    for (let index = 0; index < results.length; index += 1) {
      if (ScenarioValues.requireDefined(results[index], 'results[index]').status === 'rejected') {
        rejectedCount += 1;
      }
    }
    assert.strictEqual(rejectedCount, scenarioCase.expected.queuedRejected);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.lockedAfterClear);
    assert.strictEqual(mutex.queueSize(key), scenarioCase.expected.queueSizeAfterClear);
  }

  static async 'completeQueue-immediate'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'completeQueue-immediate'>
  ): Promise<void> {
    const mutex = Mutex.create<string>();
    await mutex.completeQueue();
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.resolvedImmediately);
  }

  static async 'completeQueue-multiple-observers'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'completeQueue-multiple-observers'
    >
  ): Promise<void> {
    const mutex = Mutex.create<string>();
    const observerStates: boolean[] = [];
    for (
      let index = 0;
      index <
      ScenarioValues.requireDefined(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'observerCount'),
        'input.batch.observerCount'
      );
      index += 1
    ) {
      observerStates.push(false);
    }
    void mutex.runExclusive(
      ScenarioValues.requireString(scenarioCase.input.key, 'input.key'),
      async () => {
        await setTimeout(50);
      }
    );
    await setTimeout(10);
    for (let index = 0; index < observerStates.length; index += 1) {
      void mutex.completeQueue().then(() => {
        observerStates[index] = true;
      });
    }
    await mutex.completeQueue();
    let notifiedCount = 0;
    for (let index = 0; index < observerStates.length; index += 1) {
      if (observerStates[index] === true) {
        notifiedCount += 1;
      }
    }
    assert.strictEqual(notifiedCount, scenarioCase.expected.observersNotified);
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.complete);
  }

  static async 'completeQueue-waits-active'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'completeQueue-waits-active'
    >
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create<string>();
    let lockReleased = false;
    void mutex.runExclusive(key, async () => {
      await setTimeout(ScenarioValues.requireNumber(scenarioCase.input.delayMs, 'input.delayMs'));
      lockReleased = true;
    });
    await setTimeout(10);
    assert.strictEqual(lockReleased, false);
    await mutex.completeQueue();
    assert.strictEqual(lockReleased, scenarioCase.expected.waitedForRelease);
    assert.strictEqual(mutex.isComplete(), true);
  }

  static async 'completeQueue-waits-multi-key'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'completeQueue-waits-multi-key'
    >
  ): Promise<void> {
    const keys = ScenarioValues.requireStringArray(scenarioCase.input.keys, 'input.keys');
    const delaysMs = ScenarioValues.requireNumberArray(scenarioCase.input.delaysMs, 'input.delaysMs');
    const mutex = Mutex.create<string>();
    const completed: string[] = [];
    for (let index = 0; index < keys.length; index += 1) {
      const key = ScenarioValues.requireDefined(keys[index], 'keys[index]');
      const operationDelay = ScenarioValues.requireDefined(delaysMs[index], 'delaysMs[index]');
      MutexCoreTestSupport.queueDelayedCompletion(mutex, key, operationDelay, completed, key);
    }
    await setTimeout(5);
    assert.strictEqual(completed.length, 0);
    await mutex.completeQueue();
    assert.strictEqual(completed.length, scenarioCase.expected.completed);
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.waitedForAll);
  }

  static async 'completeQueue-waits-queued'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'completeQueue-waits-queued'
    >
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create<string>();
    const completed: number[] = [];
    for (
      let index = 0;
      index <
      ScenarioValues.requireDefined(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'queuedCount'),
        'input.batch.queuedCount'
      );
      index += 1
    ) {
      MutexCoreTestSupport.queueDelayedCompletion(
        mutex,
        key,
        ScenarioValues.requireNumber(scenarioCase.input.delayMs, 'input.delayMs'),
        completed,
        index + 1
      );
    }
    await setTimeout(10);
    assert.strictEqual(completed.length, 0);
    await mutex.completeQueue();
    assert.deepStrictEqual(completed, scenarioCase.expected.completed);
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.waitedForQueue);
  }

  static async 'create-composite-key'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'create-composite-key'>
  ): Promise<void> {
    const mutex = Mutex.create();
    const key = MutexCoreRunners.stringifyKey(scenarioCase.input.key);
    const result = await mutex.runExclusive(key, () => {
      const expectedResult = scenarioCase.expected.result;
      return expectedResult;
    });
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static async 'create-functional'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'create-functional'>
  ): Promise<void> {
    const key = ScenarioValues.requireNumber(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create<number>();
    const release = await mutex.acquire(key);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.locked);
    release();
    assert.strictEqual(mutex.isLocked(key) === false, scenarioCase.expected.releaseWorks);
  }

  static 'create-no-config'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'create-no-config'>
  ): void {
    const mutex = Mutex.create();
    assert.strictEqual(typeof mutex === 'object', scenarioCase.expected.created);
  }

  static async 'create-number-key'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'create-number-key'>
  ): Promise<void> {
    const key = ScenarioValues.requireNumber(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create<number>();
    const result = await mutex.runExclusive(key, () => {
      const expectedResult = scenarioCase.expected.result;
      return expectedResult;
    });
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static 'create-partial-config'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'create-partial-config'>
  ): void {
    MutexCoreRunners.assertCreatedMutex(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex), scenarioCase.expected);
  }

  static async 'create-string-key'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'create-string-key'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    const result = await mutex.runExclusive(key, () => {
      const expectedResult = scenarioCase.expected.result;
      return expectedResult;
    });
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static async 'different-keys'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'different-keys'>
  ): Promise<void> {
    const keys = ScenarioValues.requireStringArray(scenarioCase.input.keys, 'input.keys');
    const mutex = Mutex.create();
    const releases: (() => void)[] = [];
    for (let index = 0; index < keys.length; index += 1) {
      releases.push(await mutex.acquire(ScenarioValues.requireDefined(keys[index], 'keys[index]')));
    }
    const lockedKeys: string[] = [];
    for (let index = 0; index < keys.length; index += 1) {
      const key = ScenarioValues.requireDefined(keys[index], 'keys[index]');
      if (mutex.isLocked(key)) {
        lockedKeys.push(key);
      }
    }
    assert.deepStrictEqual(lockedKeys, scenarioCase.expected.lockedKeys);
    const firstKey = ScenarioValues.requireDefined(keys[0], 'input.keys[0]');
    const secondKey = ScenarioValues.requireDefined(keys[1], 'input.keys[1]');
    const firstRelease = ScenarioValues.requireDefined(releases[0], 'releases[0]');
    firstRelease();
    assert.strictEqual(
      mutex.isLocked(firstKey) === false && mutex.isLocked(secondKey),
      scenarioCase.expected.independent
    );
    MutexCoreTestSupport.releaseAll(releases.slice(1));
  }

  static 'getConfig-current'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'getConfig-current'>
  ): void {
    MutexCoreRunners.assertCreatedMutex(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex), scenarioCase.expected);
  }

  static 'getConfig-default'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'getConfig-default'>
  ): void {
    const mutex = Mutex.create();
    MutexCoreRunners.assertConfigMatches(mutex.getConfig(), scenarioCase.expected);
  }

  static async 'isComplete-after-release-true'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'isComplete-after-release-true'
    >
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create<string>();
    const release = await mutex.acquire(key);
    release();
    await setTimeout(5);
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.completeAfterRelease);
  }

  static async 'isComplete-held-false'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'isComplete-held-false'>
  ): Promise<void> {
    const mutex = Mutex.create<string>();
    const release = await mutex.acquire(
      ScenarioValues.requireString(scenarioCase.input.key, 'input.key')
    );
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.complete);
    release();
  }

  static 'isComplete-initial-true'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'isComplete-initial-true'>
  ): void {
    const mutex = Mutex.create<string>();
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.complete);
  }

  static async 'isComplete-multi-active-false'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'isComplete-multi-active-false'
    >
  ): Promise<void> {
    const mutex = Mutex.create<string>();
    const releases = await MutexCoreTestSupport.acquireAll(mutex, ScenarioValues.requireStringArray(scenarioCase.input.keys, 'input.keys'));
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.complete);
    MutexCoreTestSupport.releaseAll(releases);
  }

  static async 'isComplete-queued-false'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'isComplete-queued-false'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create<string>();
    const release = await mutex.acquire(key);
    const queued = MutexCoreTestSupport.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'queuedCount'),
        'input.batch.queuedCount'
      )
    );
    await setTimeout(10);
    assert.strictEqual(mutex.isComplete(), scenarioCase.expected.complete);
    release();
    await MutexCoreTestSupport.releaseQueuedInOrder(queued);
  }

  static async 'isLocked-after-release'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'isLocked-after-release'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    const release = await mutex.acquire(key);
    release();
    await setTimeout(10);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.lockedAfterRelease);
  }

  static 'isLocked-initial-false'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'isLocked-initial-false'>
  ): void {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.locked);
  }

  static async 'isLocked-multiple-keys'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'isLocked-multiple-keys'>
  ): Promise<void> {
    const keys = ScenarioValues.requireStringArray(scenarioCase.input.keys, 'input.keys');
    const mutex = Mutex.create();
    const releases = await MutexCoreTestSupport.acquireAll(mutex, keys);
    const firstKey = ScenarioValues.requireDefined(keys[0], 'input.keys[0]');
    const secondKey = ScenarioValues.requireDefined(keys[1], 'input.keys[1]');
    assert.strictEqual(mutex.isLocked(firstKey), scenarioCase.expected.first);
    assert.strictEqual(mutex.isLocked(secondKey), scenarioCase.expected.second);
    MutexCoreTestSupport.releaseAll(releases);
  }

  static async 'isLocked-true'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'isLocked-true'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    const release = await mutex.acquire(key);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.locked);
    release();
  }

  static async 'multiple-operations'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'multiple-operations'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const operations = ScenarioValues.requireStringArray(
      scenarioCase.input.operations,
      'input.operations'
    );
    assert.strictEqual(
      operations.length,
      ScenarioValues.requireNumber(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'operationCount'),
        'input.batch.operationCount'
      )
    );
    const mutex = Mutex.create();
    const results: string[] = [];
    for (let index = 0; index < operations.length; index += 1) {
      const operation = ScenarioValues.requireDefined(operations[index], 'operations[index]');
      await MutexCoreTestSupport.runRecording(mutex, key, operation, results);
    }
    assert.deepStrictEqual(results, scenarioCase.expected.results);
    assert.strictEqual(mutex.getStats().totalExecuted, scenarioCase.expected.totalExecuted);
  }

  static async 'queue-size-exceeded'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'queue-size-exceeded'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex));
    const release = await mutex.acquire(key);
    const pending = MutexCoreTestSupport.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'queuedCount'),
        'input.batch.queuedCount'
      )
    );
    const overflow = MutexCoreTestSupport.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'overflowCount'),
        'input.batch.overflowCount'
      )
    );
    for (let index = 0; index < overflow.length; index += 1) {
      await assert.rejects(ScenarioValues.requireDefined(overflow[index], 'overflow[index]'), {
        'name': 'QueueSizeExceededError'
      });
    }
    release();
    await MutexCoreTestSupport.releaseQueuedInOrder(pending);
  }

  static async 'queued-timeout-unlinks-middle-node'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'queued-timeout-unlinks-middle-node'
    >
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex));
    const release = await mutex.acquire(key);
    const pending = MutexCoreTestSupport.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'queuedCount'),
        'input.batch.queuedCount'
      )
    );
    const firstQueued = ScenarioValues.requireDefined(pending[0], 'pending[0]');
    const secondQueued = ScenarioValues.requireDefined(pending[1], 'pending[1]');
    await assert.rejects(() => {
      return firstQueued;
    }, LockTimeoutError);
    assert.strictEqual(mutex.queueSize(key), scenarioCase.expected.queueSizeAfterTimeout);
    release();
    const releaseSecond = await secondQueued;
    releaseSecond();
    assert.strictEqual(mutex.queueSize(key), scenarioCase.expected.queueSizeAfterRelease);
  }

  static async 'queueSize-decrements'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'queueSize-decrements'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const expectedSizes = ScenarioValues.requireNumberArray(
      scenarioCase.expected.queueSize,
      'expected.queueSize'
    );
    const mutex = Mutex.create(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex));
    const release = await mutex.acquire(key);
    const pending = MutexCoreTestSupport.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'queuedCount'),
        'input.batch.queuedCount'
      )
    );
    assert.strictEqual(
      mutex.queueSize(key),
      ScenarioValues.requireDefined(expectedSizes[0], 'expected.queueSize[0]')
    );
    release();
    for (let index = 0; index < pending.length; index += 1) {
      const queuedRelease = await ScenarioValues.requireDefined(pending[index], 'pending[index]');
      assert.strictEqual(
        mutex.queueSize(key),
        ScenarioValues.requireDefined(expectedSizes[index + 1], 'expected.queueSize[index + 1]')
      );
      queuedRelease();
    }
  }

  static async 'queueSize-held-empty'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'queueSize-held-empty'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    const release = await mutex.acquire(key);
    assert.strictEqual(mutex.queueSize(key), scenarioCase.expected.queueSize);
    release();
  }

  static 'queueSize-initial-zero'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'queueSize-initial-zero'>
  ): void {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    assert.strictEqual(mutex.queueSize(key), scenarioCase.expected.queueSize);
  }

  static async 'queueSize-tracks-queued'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'queueSize-tracks-queued'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    const release = await mutex.acquire(key);
    const pending = MutexCoreTestSupport.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'queuedCount'),
        'input.batch.queuedCount'
      )
    );
    assert.strictEqual(mutex.queueSize(key), scenarioCase.expected.queueSize);
    release();
    await MutexCoreTestSupport.releaseQueuedInOrder(pending);
  }

  static async 'releases-on-throw'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'releases-on-throw'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const errorMessage = ScenarioValues.requireString(scenarioCase.input.errorMessage, 'input.errorMessage');
    const mutex = Mutex.create();
    await assert.rejects(
      () => {
        const pending = mutex.runExclusive(key, () => {
          const failure = Promise.reject(RuntimeError.create(errorMessage));
          return failure;
        });
        return pending;
      },
      { 'message': errorMessage }
    );
    await setTimeout(10);
    assert.strictEqual(mutex.isLocked(key) === false, scenarioCase.expected.released);
  }

  static async 'result-validator-rejects'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'result-validator-rejects'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    const result = await mutex.runExclusive(key, () => {
      const value = 'value';
      return value;
    });

    assert.strictEqual(result, 'value');
    assert.ok(mutex.isLocked(key) === false);
  }

  static async 'sequential-acquisitions'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'sequential-acquisitions'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    const releaseOrder: number[] = [];
    for (
      let index = 0;
      index <
      ScenarioValues.requireDefined(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'acquireCount'),
        'input.batch.acquireCount'
      );
      index += 1
    ) {
      const release = await mutex.acquire(key);
      assert.ok(mutex.isLocked(key));
      release();
      releaseOrder.push(index + 1);
      await setTimeout(10);
    }
    assert.deepStrictEqual(releaseOrder, scenarioCase.expected.releaseOrder);
  }

  static async 'size-active-locks'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'size-active-locks'>
  ): Promise<void> {
    const mutex = Mutex.create();
    const releases = await MutexCoreTestSupport.acquireAll(mutex, ScenarioValues.requireStringArray(scenarioCase.input.keys, 'input.keys'));
    assert.strictEqual(mutex.size(), scenarioCase.expected.size);
    MutexCoreTestSupport.releaseAll(releases);
  }

  static 'size-initial-zero'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'size-initial-zero'>
  ): void {
    const mutex = Mutex.create();
    assert.strictEqual(mutex.size(), scenarioCase.expected.size);
  }

  static async 'size-no-queued'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'size-no-queued'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const queuedCount = ScenarioValues.requireNumber(
      MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'queuedCount'),
      'input.batch.queuedCount'
    );
    const mutex = Mutex.create();
    const release = await mutex.acquire(key);
    const pending = MutexCoreTestSupport.createAcquireBatch(mutex, key, queuedCount);
    assert.strictEqual(mutex.size(), scenarioCase.expected.size);
    assert.strictEqual(
      mutex.size() === scenarioCase.expected.size && queuedCount > 0,
      scenarioCase.expected.queuedCountExcluded
    );
    release();
    await MutexCoreTestSupport.releaseQueuedInOrder(pending);
  }

  static async 'sync-return-number'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'sync-return-number'>
  ): Promise<void> {
    const mutex = Mutex.create<number>();
    const result = await mutex.runExclusive(
      ScenarioValues.requireNumber(scenarioCase.input.key, 'input.key'),
      () => {
        const value = scenarioCase.input.value;
        return value;
      }
    );
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static async 'sync-return-string'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'sync-return-string'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create();
    const result = await mutex.runExclusive(key, () => {
      const value = scenarioCase.input.value;
      return value;
    });
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static declaresLifecycleTests(): void {
    void it('uses the concrete async disposer when Object.prototype is malformed', async () => {
      const mutex = Mutex.create();
      const descriptor = Object.getOwnPropertyDescriptor(Object.prototype, Symbol.asyncDispose);

      assert.equal(
        Reflect.defineProperty(Object.prototype, Symbol.asyncDispose, {
          'configurable': true,
          'value': 'not-callable',
          'writable': false
        }),
        true
      );

      try {
        const lock = await mutex.acquireDisposable('non-callable-dispose');
        assert.equal(mutex.isLocked('non-callable-dispose'), true);
        await lock[Symbol.asyncDispose]();
        assert.equal(mutex.isLocked('non-callable-dispose'), false);
      } finally {
        if (descriptor === undefined) {
          const prototypeTarget: object = Object.prototype;
          assert.equal(Reflect.deleteProperty(prototypeTarget, Symbol.asyncDispose), true);
        } else {
          assert.equal(
            Reflect.defineProperty(Object.prototype, Symbol.asyncDispose, descriptor),
            true
          );
        }
      }
    });

    void it('keeps a stale release from unlocking a handed-off lock', async () => {
      const mutex = Mutex.create<string>();
      const releaseFirst = await mutex.acquire('account:42');
      const pendingSecond = mutex.acquire('account:42');

      releaseFirst();
      const releaseSecond = await pendingSecond;
      releaseFirst();

      assert.equal(mutex.isLocked('account:42'), true);
      releaseSecond();
      assert.equal(mutex.isLocked('account:42'), false);
    });

    void it('settles completeQueue observers when clear resets active work', async () => {
      const mutex = Mutex.create<string>();
      await mutex.acquire('account:42');
      const idle = mutex.completeQueue();

      mutex.clear();
      await idle;
      assert.equal(mutex.isComplete(), true);
    });

    void it('does not invoke a stale release while its earlier release hook is active', async () => {
      const mutex = HookReentrantMutex.build();
      const releaseFirst = await mutex.acquire('account:42');
      mutex.staleRelease = releaseFirst;
      const second = mutex.acquire('account:42');

      releaseFirst();
      const releaseSecond = await second;

      assert.equal(mutex.lifecycleHookErrorCount, 0);
      assert.equal(mutex.isLocked('account:42'), true);
      releaseSecond();
      await mutex.completeQueue();
    });
  }

  private static assertConfigMatches(
    config: Readonly<MutexConfigEntity.Type>,
    expected: { readonly 'maximumQueueSize'?: number; readonly 'timeout'?: number }
  ): void {
    if (expected.maximumQueueSize !== undefined) {
      assert.strictEqual(config.maximumQueueSize, expected.maximumQueueSize);
    }
    if (expected.timeout !== undefined) {
      assert.strictEqual(config.timeout, expected.timeout);
    }
  }

  private static assertCreatedMutex(
    options: Parameters<typeof Mutex.create>[0],
    expected: { readonly 'maximumQueueSize'?: number; readonly 'timeout'?: number }
  ): void {
    const mutex = Mutex.create(options);
    assert.strictEqual(typeof mutex, 'object');
    MutexCoreRunners.assertConfigMatches(mutex.getConfig(), expected);
  }

  private static stringifyKey(key: unknown): string {
    let serialized = '';
    try {
      serialized = JSON.stringify(key);
    } catch (cause) {
      throw RuntimeError.create('Scenario input.key is not JSON-serializable', { 'cause': cause });
    }
    return serialized;
  }
}

ScenarioSuite.register({
  'entity': MutexCoreScenarioCaseEntity,
  'extraTests': MutexCoreRunners.declaresLifecycleTests,
  'file': scenarioGroups,
  'name': 'Mutex core',
  'runners': MutexCoreRunners
});
