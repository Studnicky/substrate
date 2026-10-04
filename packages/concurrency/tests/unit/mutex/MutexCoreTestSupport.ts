import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import type { MutexStatsEntity } from '../../../src/entities/MutexStatsEntity.js';

import { ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { MutexConfigEntity } from '../../../src/entities/MutexConfigEntity.js';
import { Mutex } from '../../../src/mutex/Mutex.js';

export class MutexCoreTestSupport {
  static queueDelayedCompletion<TCompleted extends number | string>(
    mutex: Mutex<string>,
    key: string,
    delayMs: number,
    completed: TCompleted[],
    record: TCompleted
  ): void {
    void mutex.runExclusive(key, async () => {
      await setTimeout(delayMs);
      completed.push(record);
    });
  }

  static async runRecording(
    mutex: Mutex<string>,
    key: string,
    operation: string,
    results: string[]
  ): Promise<void> {
    await mutex.runExclusive(key, () => {
      results.push(operation);
      const settled = Promise.resolve();
      return settled;
    });
  }

  static async acquireAll(
    mutex: Mutex<string>,
    keys: readonly string[]
  ): Promise<(() => void)[]> {
    const pending: Promise<() => void>[] = [];
    for (let index = 0; index < keys.length; index += 1) {
      pending.push(mutex.acquire(ScenarioValues.requireDefined(keys[index], 'keys[index]')));
    }
    const releases = await Promise.all(pending);
    return releases;
  }

  static requireBatchNumber(batch: unknown, property: string): number {
    const batchRecord = ScenarioValues.requireRecord(batch, 'input.batch');
    const value = ScenarioValues.requireProperty(batchRecord, property, 'input.batch');
    const result = ScenarioValues.requireNumber(value, `input.batch.${property}`);
    return result;
  }

  static requireBatchNumberEntries(
    batch: unknown,
    property: string
  ): readonly (readonly [string, number])[] {
    const batchRecord = ScenarioValues.requireRecord(batch, 'input.batch');
    const value = ScenarioValues.requireProperty(batchRecord, property, 'input.batch');
    const rawEntries = Object.entries(ScenarioValues.requireRecord(value, `input.batch.${property}`));
    const result = rawEntries.map(([key, entryValue]) => {
      const entry = ScenarioValues.requireNumber(entryValue, `input.batch.${property}.${key}`);
      return [key, entry] as const;
    });
    return result;
  }

  static requireMutexOptions(value: unknown): Parameters<typeof Mutex.create>[0] {
    const result = MutexConfigEntity.intake(ScenarioValues.requireRecord(value, 'input.mutex'));
    return result;
  }
  static assertConfigMatches(
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

  static assertCreatedMutex(
    options: Parameters<typeof Mutex.create>[0],
    expected: { readonly 'maximumQueueSize'?: number; readonly 'timeout'?: number }
  ): void {
    const mutex = Mutex.create(options);
    assert.strictEqual(typeof mutex, 'object');
    MutexCoreTestSupport.assertConfigMatches(mutex.getConfig(), expected);
  }

  static assertInvalidMutexConfig(options: unknown): void {
    assert.throws(() => {
      MutexConfigEntity.intake(options);
    });
  }

  static assertStatsMatch(
    stats: MutexStatsEntity.Type,
    expected: {
      readonly 'activeLocksCount'?: number;
      readonly 'maximumQueueSize'?: number;
      readonly 'queuedCount'?: number;
      readonly 'timeout'?: number;
      readonly 'totalExecuted'?: number;
    }
  ): void {
    if (expected.activeLocksCount !== undefined) {
      assert.strictEqual(stats.activeLocksCount, expected.activeLocksCount);
    }
    if (expected.queuedCount !== undefined) {
      assert.strictEqual(stats.queuedCount, expected.queuedCount);
    }
    if (expected.totalExecuted !== undefined) {
      assert.strictEqual(stats.totalExecuted, expected.totalExecuted);
    }
    if (expected.maximumQueueSize !== undefined) {
      assert.strictEqual(stats.maximumQueueSize, expected.maximumQueueSize);
    }
    if (expected.timeout !== undefined) {
      assert.strictEqual(stats.timeout, expected.timeout);
    }
  }

  static createAcquireBatch(
    mutex: Mutex<string>,
    key: string,
    count: number
  ): Promise<() => void>[] {
    const acquisitions: Promise<() => void>[] = [];
    for (let index = 0; index < count; index += 1) {
      acquisitions.push(mutex.acquire(key));
    }
    return acquisitions;
  }

  static releaseAll(releases: readonly (() => void)[]): void {
    for (let index = 0; index < releases.length; index += 1) {
      ScenarioValues.requireDefined(releases[index], 'releases[index]')();
    }
  }

  static async releaseQueuedInOrder(
    acquisitions: readonly Promise<() => void>[]
  ): Promise<void> {
    for (let index = 0; index < acquisitions.length; index += 1) {
      const release = await ScenarioValues.requireDefined(
        acquisitions[index],
        'acquisitions[index]'
      );
      release();
    }
  }
}
