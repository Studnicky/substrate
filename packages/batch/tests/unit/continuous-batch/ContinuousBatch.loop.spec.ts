import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { BatchStatsEntity } from '../../../src/entities/BatchStatsEntity.js';

import { Batch, BatchError } from '../../../src/index.js';
import scenarioGroups from './ContinuousBatch.scenarios.json' with { 'type': 'json' };
import { ContinuousBatchScenarioCaseEntity } from './entities/ContinuousBatchScenarioCaseEntity.js';

class LifecycleBatch extends Batch<number> {
  public batchCompleteStats: BatchStatsEntity.Type[] = [];
  public batchStartCount = 0;
  public readonly batchCompleted = Promise.withResolvers<void>();

  public constructor(maximumConcurrent: number) {
    super(maximumConcurrent);
  }

  protected override onBatchStart(): void {
    this.batchStartCount += 1;
  }

  protected override onBatchComplete(stats: BatchStatsEntity.Type): void {
    this.batchCompleteStats.push(stats);
    this.batchCompleted.resolve();
  }
}

class ContinuousBatchRunners {
  static async 'empty-input'(scenarioCase: ScenarioCaseOfType<ContinuousBatchScenarioCaseEntity.Type, 'empty-input'>): Promise<void> {
    const batch = new LifecycleBatch(scenarioCase.input.maximumConcurrent);
    const results = await batch.processContinuous(scenarioCase.input.items, ContinuousBatchRunners.identity);
    assert.deepEqual(results, scenarioCase.expected.results);
    assert.equal(batch.batchStartCount, scenarioCase.expected.batchStartCount);
    assert.equal(batch.batchCompleteStats.length, scenarioCase.expected.batchCompleteCount);
  }

  static async 'fail-fast-completion'(scenarioCase: ScenarioCaseOfType<ContinuousBatchScenarioCaseEntity.Type, 'fail-fast-completion'>): Promise<void> {
    const batch = new LifecycleBatch(scenarioCase.input.maximumConcurrent);
    const slowItemStarted = Promise.withResolvers<void>();
    const releaseSlowItem = Promise.withResolvers<void>();
    const pending = batch.processContinuous(scenarioCase.input.items, async (item): Promise<number> => {
      if (item === scenarioCase.input.failure) {
        await slowItemStarted.promise;
        throw new BatchError(scenarioCase.expected.rejectedMessage);
      }
      slowItemStarted.resolve();
      await releaseSlowItem.promise;
      return item;
    });
    const deadline = Promise.withResolvers<void>();
    const deadlineTimer = setTimeout(() => {
      deadline.reject(new BatchError('processContinuous did not reject before the slow item settled'));
    }, scenarioCase.input.rejectionDeadlineMs);
    try {
      await Promise.race([
        assert.rejects(pending, (error) => {
          assert.ok(error instanceof BatchError);
          assert.strictEqual(error.code, 'batch.invalidConfig');
          assert.strictEqual(error.message, scenarioCase.expected.rejectedMessage);
          assert.strictEqual(error.retryable, false);
          return true;
        }),
        deadline.promise
      ]);
    } finally {
      clearTimeout(deadlineTimer);
    }
    assert.deepEqual(batch.batchCompleteStats, []);
    releaseSlowItem.resolve();
    await batch.batchCompleted.promise;
    assert.deepEqual(batch.batchCompleteStats, [scenarioCase.expected.stats]);
  }

  static async 'immediate-refill'(scenarioCase: ScenarioCaseOfType<ContinuousBatchScenarioCaseEntity.Type, 'immediate-refill'>): Promise<void> {
    const events: string[] = [];
    const results = await Batch.create<number>(scenarioCase.input.maximumConcurrent).processContinuous(
      scenarioCase.input.items,
      async (item): Promise<number> => {
        events.push(`start-${String(item)}`);
        let delay = 0;
        if (item === 1) {
          delay = scenarioCase.input.slowDelayMs;
        } else if (item === 2) {
          delay = scenarioCase.input.fastDelayMs;
        }
        await ContinuousBatchRunners.waitMs(delay);
        events.push(`end-${String(item)}`);
        const scaled = item * 10;
        return scaled;
      }
    );
    assert.deepEqual(results, scenarioCase.expected.results);
    assert.equal(events.indexOf('start-3') < events.indexOf('end-1'), scenarioCase.expected.refilledBeforeSlowestFinished);
  }

  static async 'settled-results'(scenarioCase: ScenarioCaseOfType<ContinuousBatchScenarioCaseEntity.Type, 'settled-results'>): Promise<void> {
    const results = await Batch.create<number>(scenarioCase.input.maximumConcurrent).processContinuousSettled(
      scenarioCase.input.items,
      async (item): Promise<number> => {
        if (item === scenarioCase.input.failure) {
          throw new BatchError('failed item');
        }
        return await Promise.resolve(item);
      }
    );
    const statuses: string[] = [];
    for (let index = 0; index < results.length; index += 1) {
      statuses.push(String(results[index]?.status));
    }
    assert.deepEqual(statuses, scenarioCase.expected.statuses);
  }

  private static async identity(item: number): Promise<number> {
    await Promise.resolve();
    return item;
  }

  private static waitMs(milliseconds: number): Promise<void> {
    const waited = new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
    return waited;
  }
}

ScenarioSuite.register({
  'entity': ContinuousBatchScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Batch continuous operations',
  'runners': ContinuousBatchRunners
});
