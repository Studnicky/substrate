import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { MutexCoreScenarioCaseEntity } from './entities/MutexCoreScenarioCaseEntity.js';

import { ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { configInternal } from '../../../src/mutex/configInternal.js';
import { Mutex } from '../../../src/mutex/Mutex.js';
import { MutexCoreTestSupport } from './MutexCoreTestSupport.js';

export class MutexCoreConfigurationRunners {
  static 'config-defaults'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'config-defaults'>
  ): void {
    const mutex = Mutex.create();
    MutexCoreTestSupport.assertConfigMatches(mutex.getConfig(), scenarioCase.expected);
  }

  static 'config-empty'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'config-empty'>
  ): void {
    MutexCoreTestSupport.assertCreatedMutex(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex), scenarioCase.expected);
  }

  static 'config-external-modification'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'config-external-modification'
    >
  ): void {
    const mutex = Mutex.create(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex));
    const config = mutex.getConfig();
    Object.assign(config, { 'maximumQueueSize': 999 });
    assert.strictEqual(mutex.getConfig().maximumQueueSize, scenarioCase.expected.maximumQueueSize);
    assert.strictEqual(
      mutex.getConfig().maximumQueueSize === scenarioCase.expected.maximumQueueSize,
      scenarioCase.expected.externalMutationIgnored
    );
  }

  static 'config-full'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'config-full'>
  ): void {
    MutexCoreTestSupport.assertCreatedMutex(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex), scenarioCase.expected);
  }

  static 'config-invalid-maxQueue-float'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'config-invalid-maxQueue-float'
    >
  ): void {
    MutexCoreTestSupport.assertInvalidMutexConfig(scenarioCase.input.mutex);
  }

  static 'config-invalid-maxQueue-negative'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'config-invalid-maxQueue-negative'
    >
  ): void {
    MutexCoreTestSupport.assertInvalidMutexConfig(scenarioCase.input.mutex);
  }

  static 'config-invalid-timeout-float'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'config-invalid-timeout-float'
    >
  ): void {
    MutexCoreTestSupport.assertInvalidMutexConfig(scenarioCase.input.mutex);
  }

  static 'config-invalid-timeout-negative'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'config-invalid-timeout-negative'
    >
  ): void {
    MutexCoreTestSupport.assertInvalidMutexConfig(scenarioCase.input.mutex);
  }

  static async 'config-no-limits'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'config-no-limits'>
  ): Promise<void> {
    const mutex = Mutex.create(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex));
    const result = await mutex.runExclusive(
      ScenarioValues.requireString(scenarioCase.input.key, 'input.key'),
      () => {
        const settled = Promise.resolve(scenarioCase.input.result);
        return settled;
      }
    );
    assert.strictEqual(result, scenarioCase.expected.runExclusive);
  }

  static 'config-partial-maxQueue-5'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'config-partial-maxQueue-5'>
  ): void {
    MutexCoreTestSupport.assertCreatedMutex(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex), scenarioCase.expected);
  }

  static 'config-partial-maxQueue-50'(
    scenarioCase: ScenarioCaseOfType<
      MutexCoreScenarioCaseEntity.Type,
      'config-partial-maxQueue-50'
    >
  ): void {
    MutexCoreTestSupport.assertCreatedMutex(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex), scenarioCase.expected);
  }

  static 'config-partial-timeout'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'config-partial-timeout'>
  ): void {
    MutexCoreTestSupport.assertCreatedMutex(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex), scenarioCase.expected);
  }

  static 'config-return-copy'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'config-return-copy'>
  ): void {
    const mutex = Mutex.create(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex));
    const config1 = mutex.getConfig();
    const config2 = mutex.getConfig();
    assert.strictEqual(config1 === config2, scenarioCase.expected.sameReference);
    if (ScenarioValues.requireBoolean(scenarioCase.expected.sameValue, 'expected.sameValue')) {
      assert.deepStrictEqual(config1, config2);
    } else {
      assert.notDeepStrictEqual(config1, config2);
    }
  }

  static 'config-unknown-key'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'config-unknown-key'>
  ): void {
    MutexCoreTestSupport.assertInvalidMutexConfig(scenarioCase.input.mutex);
  }

  static 'validateConfig-invalid'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'validateConfig-invalid'>
  ): void {
    assert.throws(() => {
      configInternal.validateConfig(scenarioCase.input.mutex);
    });
  }

  static 'validateConfig-valid'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'validateConfig-valid'>
  ): void {
    const config = configInternal.validateConfig(scenarioCase.input.mutex);
    MutexCoreTestSupport.assertConfigMatches(config, scenarioCase.expected);
  }

  static async 'stats-active-locks'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'stats-active-locks'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create<string>();
    const release = await mutex.acquire(key);
    MutexCoreTestSupport.assertStatsMatch(mutex.getStats(), {
      'activeLocksCount': ScenarioValues.requireNumber(scenarioCase.expected.activeLocksCount, 'expected.activeLocksCount'),
      'totalExecuted': 1
    });
    release();
  }

  static 'stats-api-shape'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'stats-api-shape'>
  ): void {
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
  }

  static 'stats-initial'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'stats-initial'>
  ): void {
    const mutex = Mutex.create<string>(MutexCoreTestSupport.requireMutexOptions(scenarioCase.input.mutex));
    MutexCoreTestSupport.assertStatsMatch(mutex.getStats(), scenarioCase.expected);
  }

  static async 'stats-multiple-active'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'stats-multiple-active'>
  ): Promise<void> {
    const keys = ScenarioValues.requireStringArray(scenarioCase.input.keys, 'input.keys');
    const mutex = Mutex.create<string>();
    const releases = await MutexCoreTestSupport.acquireAll(mutex, keys);
    MutexCoreTestSupport.assertStatsMatch(mutex.getStats(), {
      'activeLocksCount': ScenarioValues.requireNumber(scenarioCase.expected.activeLocksCount, 'expected.activeLocksCount'),
      'queuedCount': 0,
      'totalExecuted': keys.length
    });
    MutexCoreTestSupport.releaseAll(releases);
  }

  static async 'stats-queued'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'stats-queued'>
  ): Promise<void> {
    const key = ScenarioValues.requireString(scenarioCase.input.key, 'input.key');
    const mutex = Mutex.create<string>();
    const release = await mutex.acquire(key);
    for (
      let index = 0;
      index <
      ScenarioValues.requireDefined(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'queuedCount'),
        'input.batch.queuedCount'
      );
      index += 1
    ) {
      void mutex.runExclusive(key, async () => {
        await setTimeout(5);
      });
    }
    await setTimeout(10);
    MutexCoreTestSupport.assertStatsMatch(mutex.getStats(), {
      'activeLocksCount': 1,
      'queuedCount': ScenarioValues.requireNumber(scenarioCase.expected.queuedCount, 'expected.queuedCount'),
      'totalExecuted': 1
    });
    release();
    await mutex.completeQueue();
  }

  static async 'stats-queued-multi-key'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'stats-queued-multi-key'>
  ): Promise<void> {
    const mutex = Mutex.create<string>();
    const releases = await MutexCoreTestSupport.acquireAll(mutex, ScenarioValues.requireStringArray(scenarioCase.input.keys, 'input.keys'));
    const queuedEntries = MutexCoreTestSupport.requireBatchNumberEntries(
      scenarioCase.input.batch,
      'queuedPerKey'
    );
    for (let entryIndex = 0; entryIndex < queuedEntries.length; entryIndex += 1) {
      const [key, queuedCount] = ScenarioValues.requireDefined(
        queuedEntries[entryIndex],
        'queuedEntries[entryIndex]'
      );
      for (let index = 0; index < queuedCount; index += 1) {
        void mutex.runExclusive(key, async () => {
          await setTimeout(5);
        });
      }
    }
    await setTimeout(10);
    MutexCoreTestSupport.assertStatsMatch(mutex.getStats(), scenarioCase.expected);
    MutexCoreTestSupport.releaseAll(releases);
    await mutex.completeQueue();
  }

  static async 'stats-total-executed'(
    scenarioCase: ScenarioCaseOfType<MutexCoreScenarioCaseEntity.Type, 'stats-total-executed'>
  ): Promise<void> {
    const keys = ScenarioValues.requireStringArray(scenarioCase.input.keys, 'input.keys');
    const mutex = Mutex.create<string>();
    for (
      let index = 0;
      index <
      ScenarioValues.requireDefined(
        MutexCoreTestSupport.requireBatchNumber(scenarioCase.input.batch, 'operationCount'),
        'input.batch.operationCount'
      );
      index += 1
    ) {
      await mutex.runExclusive(
        ScenarioValues.requireDefined(keys[index % keys.length], 'keys[index % keys.length]'),
        () => {
          const settled = Promise.resolve();
          return settled;
        }
      );
    }
    MutexCoreTestSupport.assertStatsMatch(mutex.getStats(), scenarioCase.expected);
  }
}
