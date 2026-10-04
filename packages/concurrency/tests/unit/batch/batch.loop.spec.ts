import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { Batch } from '../../../src/batch/Batch.js';
import scenarioGroups from './batch.scenarios.json' with { 'type': 'json' };
import { BatchScenarioCaseEntity } from './entities/BatchScenarioCaseEntity.js';
import { BatchCollector } from './helpers/BatchCollector.js';
import { Delay } from './helpers/Delay.js';

class BatchRunners {
  static async 'process-default-max-concurrent'(scenarioCase: ScenarioCaseOfType<BatchScenarioCaseEntity.Type, 'process-default-max-concurrent'>): Promise<void> {
    const { expected, input } = scenarioCase;
    let maximumConcurrentObserved = 0;
    let currentConcurrent = 0;
    const observe = async (item: number): Promise<number> => {
      currentConcurrent += 1;
      if (currentConcurrent > maximumConcurrentObserved) {
        maximumConcurrentObserved = currentConcurrent;
      }
      await Delay.ms(10);
      currentConcurrent -= 1;
      return item;
    };
    for await (const batch of BatchRunners.createScenarioBatch<number>(input).process(input.items, observe)) {
      assert.ok(batch.length > 0);
    }
    assert.strictEqual(maximumConcurrentObserved, expected.maximumConcurrentObserved);
  }

  static async 'process-empty'(scenarioCase: ScenarioCaseOfType<BatchScenarioCaseEntity.Type, 'process-empty'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const batches = await Array.fromAsync(BatchRunners.createScenarioBatch<number>(input).process(input.items, BatchRunners.doubleItem));
    assert.deepStrictEqual(batches, expected.batches);
  }

  static 'process-invalid-max-concurrent'(scenarioCase: ScenarioCaseOfType<BatchScenarioCaseEntity.Type, 'process-invalid-max-concurrent'>): void {
    const { expected, input } = scenarioCase;
    assert.throws(() => {
      BatchRunners.createScenarioBatch<number>(input);
    }, (thrown) => {
      const error: unknown = thrown;
      assert.ok(error instanceof Error);
      BatchRunners.assertErrorMessageIncludes(error, expected.message);
      return true;
    });
  }

  static async 'process-multi-batch'(scenarioCase: ScenarioCaseOfType<BatchScenarioCaseEntity.Type, 'process-multi-batch'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const delayedDouble = async (item: number): Promise<number> => {
      await Delay.ms(input.delayMs);
      const doubled = item * 2;
      return doubled;
    };
    const batches = await Array.fromAsync(BatchRunners.createScenarioBatch<number>(input).process(input.items, delayedDouble));
    assert.deepStrictEqual(batches, expected.batches);
  }

  static async 'process-order'(scenarioCase: ScenarioCaseOfType<BatchScenarioCaseEntity.Type, 'process-order'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const delayedTenfold = async (item: number): Promise<number> => {
      const index = input.items.indexOf(item);
      await Delay.ms(Number(input.delays[index]));
      const scaled = item * 10;
      return scaled;
    };
    const generator = BatchRunners.createScenarioBatch<number>(input).process(input.items, delayedTenfold);
    const allResults = await BatchCollector.collect(generator);
    assert.deepStrictEqual(allResults, expected.results);
  }

  static async 'process-propagates-errors'(scenarioCase: ScenarioCaseOfType<BatchScenarioCaseEntity.Type, 'process-propagates-errors'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const failOnErrorItem = async (item: number): Promise<number> => {
      const settled = await Promise.resolve(item);
      if (settled === input.errorItem) {
        throw RuntimeError.create(input.errorMessage);
      }
      return settled;
    };
    const consumeGenerator = async (): Promise<void> => {
      for await (const batch of BatchRunners.createScenarioBatch<number>(input).process(input.items, failOnErrorItem)) {
        assert.ok(Array.isArray(batch));
      }
    };
    await assert.rejects(consumeGenerator, (thrown) => {
      const error: unknown = thrown;
      assert.ok(error instanceof Error);
      BatchRunners.assertErrorMessageIncludes(error, expected.rejectedMessage);
      return true;
    });
  }

  static async 'process-returns-results'(scenarioCase: ScenarioCaseOfType<BatchScenarioCaseEntity.Type, 'process-returns-results'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const batch = BatchRunners.createScenarioBatch<number>(input);
    const results = await BatchCollector.collect(batch.process(input.items, BatchRunners.doubleItem));
    assert.deepStrictEqual(results, expected.results);
  }

  static async 'process-settled-returns-results'(scenarioCase: ScenarioCaseOfType<BatchScenarioCaseEntity.Type, 'process-settled-returns-results'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const batch = BatchRunners.createScenarioBatch<number>(input);
    const results = await BatchCollector.collect(batch.processSettled(input.items, BatchRunners.doubleItem));
    const values: (number | undefined)[] = [];
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      assert.ok(result !== undefined);
      assert.strictEqual(result.status, 'fulfilled');
      values.push(result.status === 'fulfilled' ? result.value : undefined);
    }
    assert.deepStrictEqual(values, expected.results);
  }

  static async 'process-single-batch'(scenarioCase: ScenarioCaseOfType<BatchScenarioCaseEntity.Type, 'process-single-batch'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const batches = await Array.fromAsync(BatchRunners.createScenarioBatch<number>(input).process(input.items, BatchRunners.doubleItem));
    assert.deepStrictEqual(batches, expected.batches);
  }

  static async 'process-single-batch-concurrent'(scenarioCase: ScenarioCaseOfType<BatchScenarioCaseEntity.Type, 'process-single-batch-concurrent'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const executionOrder: number[] = [];
    const expectedBatch: number[] = [];
    for (let index = 0; index < input.items.length; index += 1) {
      expectedBatch.push(Number(input.items[index]) * 2);
    }
    const recordAndDouble = async (item: number): Promise<number> => {
      executionOrder.push(item);
      await Delay.ms(input.delayMs);
      const doubled = item * 2;
      return doubled;
    };
    for await (const batch of BatchRunners.createScenarioBatch<number>(input).process(input.items, recordAndDouble)) {
      assert.deepStrictEqual(batch, expectedBatch);
    }
    assert.strictEqual(executionOrder.length, expected.executionCount);
  }

  static async 'process-stops-on-first-error'(scenarioCase: ScenarioCaseOfType<BatchScenarioCaseEntity.Type, 'process-stops-on-first-error'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const processed: number[] = [];
    const batchesReceived: number[][] = [];
    const recordAndFail = async (item: number): Promise<number> => {
      processed.push(item);
      await Delay.ms(10);
      if (item === input.errorItem) {
        throw RuntimeError.create(input.errorMessage);
      }
      return item;
    };

    const consumeGenerator = async (): Promise<void> => {
      for await (const batch of BatchRunners.createScenarioBatch<number>(input).process(input.items, recordAndFail)) {
        batchesReceived.push(batch);
      }
    };

    await assert.rejects(consumeGenerator, (thrown) => {
      const error: unknown = thrown;
      assert.ok(error instanceof Error);
      BatchRunners.assertErrorMessageIncludes(error, expected.rejectedMessage);
      return true;
    });
    assert.deepStrictEqual(processed, expected.processed);
    assert.deepStrictEqual(batchesReceived, expected.batches);
  }

  static async 'process-waits-for-batch-completion'(scenarioCase: ScenarioCaseOfType<BatchScenarioCaseEntity.Type, 'process-waits-for-batch-completion'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const maximumConcurrent = input.batch.maximumConcurrent;
    assert.ok(maximumConcurrent !== undefined, 'Scenario input.batch.maximumConcurrent is required');
    const batchTimestamps: number[] = [];
    const startTime = Date.now();
    const delayedIdentity = async (item: number): Promise<number> => {
      await Delay.ms(input.delayMs);
      return item;
    };
    for await (const batch of BatchRunners.createScenarioBatch<number>(input).process(input.items, delayedIdentity)) {
      assert.strictEqual(batch.length, maximumConcurrent);
      batchTimestamps.push(Date.now() - startTime);
    }
    assert.strictEqual(batchTimestamps.length, expected.batchCount);
    const first = batchTimestamps[0];
    const second = batchTimestamps[1];
    assert.ok(first !== undefined && second !== undefined, 'Expected two batch timestamps');
    assert.ok(second - first >= expected.minimumGapMs);
  }

  private static assertErrorMessageIncludes(error: Error, expectedMessage: string): void {
    assert.equal(error.message.includes(expectedMessage), true);
  }

  private static createScenarioBatch<TResult = unknown>(input: { 'batch': { 'maximumConcurrent'?: number } }): Batch<TResult> {
    const batch = Batch.create<TResult>(input.batch.maximumConcurrent);
    return batch;
  }

  private static async doubleItem(item: number): Promise<number> {
    const doubled = await Promise.resolve(item * 2);
    return doubled;
  }
}

ScenarioSuite.register({
  'entity': BatchScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Batch',
  'runners': BatchRunners
});
