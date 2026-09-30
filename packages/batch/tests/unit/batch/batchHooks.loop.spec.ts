import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { BatchStatsEntity } from '../../../src/entities/BatchStatsEntity.js';

import { Batch } from '../../../src/batch/Batch.js';
import { BatchCollector } from '../../helpers/BatchCollector.js';
import scenarioGroups from './batchHooks.scenarios.json' with { 'type': 'json' };
import { BatchHooksScenarioCaseEntity } from './entities/BatchHooksScenarioCaseEntity.js';

/** A batch that exposes the hook diagnostics it accumulated. */
class HookInspectingBatch extends Batch<number> {
  public constructor(maximumConcurrent?: number) {
    super(maximumConcurrent);
  }

  public get recordedHookErrorCount(): number {
    return this.hooks.hookErrorCount;
  }

  public get recordedHookErrors(): readonly HookInvocationError[] {
    const hookErrors = this.hooks.getHookErrors();
    return hookErrors;
  }
}

/** A batch whose success and error hooks throw for configured item indices. */
class FlakyHooksBatch extends HookInspectingBatch {
  readonly #errorHookIndex: number;
  readonly #successHookIndex: number;

  public constructor(maximumConcurrent: number | undefined, successHookIndex: number, errorHookIndex: number) {
    super(maximumConcurrent);
    this.#successHookIndex = successHookIndex;
    this.#errorHookIndex = errorHookIndex;
  }

  protected override onItemSuccess(index: number): void {
    if (index === this.#successHookIndex) {
      throw RuntimeError.create(`onItemSuccess boom for index ${String(index)}`);
    }
  }

  protected override onItemError(index: number): void {
    if (index === this.#errorHookIndex) {
      throw RuntimeError.create(`onItemError boom for index ${String(index)}`);
    }
  }
}

/** A batch whose success hook always throws a message derived from the result. */
class IsolatedFailureBatch extends HookInspectingBatch {
  protected override onItemSuccess(_index: number, result: number): void {
    throw RuntimeError.create(`hook failure for ${String(result)}`);
  }
}

/** A batch that records every hook invocation and its arguments. */
class RecordingBatch<TResult = unknown> extends Batch<TResult> {
  public batchStartArguments: number[] = [];
  public itemStartArguments: number[] = [];
  public itemSuccessArguments: [number, TResult][] = [];
  public itemErrorArguments: [number, Error][] = [];
  public itemSettledArguments: number[] = [];
  public concurrencySaturatedCount = 0;
  public batchCompleteArguments: BatchStatsEntity.Type[] = [];

  public constructor(maximumConcurrent?: number) {
    super(maximumConcurrent);
  }

  protected override onBatchStart(total: number): void {
    this.batchStartArguments.push(total);
  }

  protected override onConcurrencySaturated(): void {
    this.concurrencySaturatedCount += 1;
  }

  protected override onItemStart(index: number): void {
    this.itemStartArguments.push(index);
  }

  protected override onItemSuccess(index: number, result: TResult): void {
    this.itemSuccessArguments.push([index, result]);
  }

  protected override onItemError(index: number, error: Error): void {
    this.itemErrorArguments.push([index, error]);
  }

  protected override onItemSettled(index: number): void {
    this.itemSettledArguments.push(index);
  }

  protected override onBatchComplete(stats: BatchStatsEntity.Type): void {
    this.batchCompleteArguments.push(stats);
  }
}

/** A batch whose listed hooks append `<hook>-<index>` to a shared order list. */
class OrderRecordingBatch extends Batch<number> {
  readonly #hookNames: readonly string[];
  readonly #order: string[];

  public constructor(maximumConcurrent: number | undefined, order: string[], hookNames: readonly string[]) {
    super(maximumConcurrent);
    this.#order = order;
    this.#hookNames = hookNames;
  }

  protected override onItemError(index: number): void {
    this.record('error', index);
  }

  protected override onItemSettled(index: number): void {
    this.record('settled', index);
  }

  protected override onItemSuccess(index: number): void {
    this.record('success', index);
  }

  private record(hookName: string, index: number): void {
    if (this.#hookNames.includes(hookName)) {
      this.#order.push(`${hookName}-${String(index)}`);
    }
  }
}

/** A batch whose chosen hook throws a fixed message. */
class ThrowingHookBatch extends HookInspectingBatch {
  readonly #hookName: string;

  public constructor(maximumConcurrent: number | undefined, hookName: string) {
    super(maximumConcurrent);
    this.#hookName = hookName;
  }

  protected override onBatchComplete(): void {
    this.failWhen('onBatchComplete');
  }

  protected override onItemSuccess(): void {
    this.failWhen('onItemSuccess');
  }

  private failWhen(hookName: string): void {
    if (this.#hookName === hookName) {
      throw RuntimeError.create('hook boom');
    }
  }
}

class BatchHooksRunners {
  static async 'async-hook-error-safe'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'async-hook-error-safe'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const batch = new HookInspectingBatch(input.batch.maximumConcurrent);
    Object.assign(batch, {
      'onItemSuccess': () => {
        const pending = BatchHooksRunners.rejectAfterTick(input.hookErrorMessage);
        return pending;
      }
    });
    const rejectionEvents: unknown[] = [];
    const listener = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', listener);

    try {
      const results = await BatchCollector.collect(batch.processSettled(input.items, BatchHooksRunners.identity));
      assert.deepStrictEqual(BatchHooksRunners.statusesOf(results), expected.statuses);
      await BatchHooksRunners.flushImmediate();
      await BatchHooksRunners.flushImmediate();
      assert.strictEqual(rejectionEvents.length, expected.unhandledRejections);
      assert.strictEqual(batch.recordedHookErrorCount, expected.hookErrorCount);
      assert.strictEqual(batch.recordedHookErrors.length, expected.hookErrorCount);
    } finally {
      process.off('unhandledRejection', listener);
    }
  }

  static async 'continue-on-hook-error'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'continue-on-hook-error'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const batch = new FlakyHooksBatch(input.batch.maximumConcurrent, input.successHookErrorIndex, input.errorHookErrorIndex);
    const failOnErrorItem = async (item: number): Promise<number> => {
      const settled = await Promise.resolve(item);
      if (settled === input.errorItem) {
        throw RuntimeError.create(input.operationErrorMessage);
      }
      return settled;
    };
    const results = await BatchCollector.collect(batch.processSettled(input.items, failOnErrorItem));
    assert.strictEqual(results.length, expected.statuses.length);
    assert.deepStrictEqual(BatchHooksRunners.statusesOf(results), expected.statuses);
    assert.strictEqual(batch.recordedHookErrorCount, expected.hookErrorCount);
    assert.strictEqual(batch.recordedHookErrors.length, expected.hookErrorCount);
  }

  static async 'hook-errors-owned-by-instance'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'hook-errors-owned-by-instance'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const first = new IsolatedFailureBatch(input.batch.maximumConcurrent);
    const second = new IsolatedFailureBatch(input.batch.maximumConcurrent);
    await BatchCollector.collect(first.process([input.firstItem], BatchHooksRunners.identity));
    await BatchCollector.collect(second.process([input.secondItem], BatchHooksRunners.identity));
    const firstError = first.recordedHookErrors[0];
    const secondError = second.recordedHookErrors[0];
    assert.equal(first.recordedHookErrorCount, expected.firstHookErrorCount);
    assert.equal(second.recordedHookErrorCount, expected.secondHookErrorCount);
    assert.ok(firstError instanceof HookInvocationError);
    assert.ok(secondError instanceof HookInvocationError);
    assert.equal(firstError.hookName, 'onItemSuccess');
    assert.equal(secondError.hookName, 'onItemSuccess');
    assert.ok(firstError.cause instanceof Error);
    assert.ok(secondError.cause instanceof Error);
    assert.equal(firstError.cause.message, expected.firstCauseMessage);
    assert.equal(secondError.cause.message, expected.secondCauseMessage);
  }

  static async 'on-batch-complete'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'on-batch-complete'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    await BatchCollector.collect(recording.process(input.items, BatchHooksRunners.identity));
    assert.strictEqual(recording.batchCompleteArguments.length, expected.batchCompleteCount);
    assert.deepStrictEqual(recording.batchCompleteArguments[0], expected.stats);
  }

  static async 'on-batch-complete-abort'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'on-batch-complete-abort'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    const failOnErrorItem = BatchHooksRunners.failOn(input.errorItem, input.errorMessage);
    const run = async (): Promise<void> => {
      await BatchCollector.collect(recording.process(input.items, failOnErrorItem));
    };
    await assert.rejects(run, (thrown) => {
      const error: unknown = thrown;
      assert.ok(error instanceof Error);
      BatchHooksRunners.assertErrorMessageIncludes(error, expected.rejectedMessage);
      return true;
    });
    assert.strictEqual(recording.batchCompleteArguments.length, expected.batchCompleteCount);
  }

  static async 'on-batch-start'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'on-batch-start'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    await BatchCollector.collect(recording.process(input.items, BatchHooksRunners.identity));
    assert.strictEqual(recording.batchStartArguments.length, expected.batchStartCount);
    assert.strictEqual(recording.batchStartArguments[0], expected.total);
  }

  static async 'on-concurrency-saturated'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'on-concurrency-saturated'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    await BatchCollector.collect(recording.process(input.items, BatchHooksRunners.identity));
    assert.strictEqual(recording.concurrencySaturatedCount, expected.concurrencySaturatedCount);
  }

  static async 'on-item-error'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'on-item-error'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    const failOnErrorItem = BatchHooksRunners.failOn(input.errorItem, input.errorMessage);
    const run = async (): Promise<void> => {
      await BatchCollector.collect(recording.process(input.items, failOnErrorItem));
    };
    await assert.rejects(run, (thrown) => {
      const error: unknown = thrown;
      assert.ok(error instanceof Error);
      BatchHooksRunners.assertErrorMessageIncludes(error, expected.rejectedMessage);
      return true;
    });
    assert.strictEqual(recording.itemErrorArguments.length, expected.itemErrorCount);
    assert.strictEqual(recording.itemErrorArguments[0]?.[0], expected.firstErrorIndex);
  }

  static async 'on-item-error-order'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'on-item-error-order'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const order: string[] = [];
    const batch = new OrderRecordingBatch(input.batch.maximumConcurrent, order, ['error', 'settled']);
    const alwaysFail = async (): Promise<number> => {
      await Promise.resolve();
      throw RuntimeError.create(input.errorMessage);
    };
    const run = async (): Promise<void> => {
      await BatchCollector.collect(batch.process(input.items, alwaysFail));
    };
    await assert.rejects(run, (thrown) => {
      const error: unknown = thrown;
      assert.ok(error instanceof Error);
      BatchHooksRunners.assertErrorMessageIncludes(error, expected.rejectedMessage);
      return true;
    });
    assert.deepStrictEqual(order, expected.order);
  }

  static async 'on-item-settled'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'on-item-settled'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    const failOnErrorItem = BatchHooksRunners.failOn(input.errorItem, input.errorMessage);
    const run = async (): Promise<void> => {
      await BatchCollector.collect(recording.process(input.items, failOnErrorItem));
    };
    await assert.rejects(run, (thrown) => {
      const error: unknown = thrown;
      assert.ok(error instanceof Error);
      BatchHooksRunners.assertErrorMessageIncludes(error, expected.rejectedMessage);
      return true;
    });
    assert.strictEqual(recording.itemSettledArguments.length, expected.itemSettledCount);
  }

  static async 'on-item-start'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'on-item-start'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    await BatchCollector.collect(recording.process(input.items, BatchHooksRunners.identity));
    assert.strictEqual(recording.itemStartArguments.length, expected.itemStartCount);
    assert.deepStrictEqual(BatchHooksRunners.sortedNumbers(recording.itemStartArguments), expected.sortedIndices);
  }

  static async 'on-item-success'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'on-item-success'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    await BatchCollector.collect(recording.process(input.items, BatchHooksRunners.doubleItem));
    assert.strictEqual(recording.itemSuccessArguments.length, expected.itemSuccessCount);
    assert.deepStrictEqual(BatchHooksRunners.sortedSuccessResults(recording.itemSuccessArguments), expected.sortedResults);
  }

  static async 'on-item-success-order'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'on-item-success-order'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const order: string[] = [];
    const batch = new OrderRecordingBatch(input.batch.maximumConcurrent, order, ['success', 'settled']);
    await BatchCollector.collect(batch.process(input.items, BatchHooksRunners.identity));
    assert.deepStrictEqual(order, expected.order);
  }

  static async 'process-settled-all-fail'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'process-settled-all-fail'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    const alwaysFail = async (): Promise<number> => {
      await Promise.resolve();
      throw RuntimeError.create(input.errorMessage);
    };
    await BatchCollector.collect(recording.processSettled(input.items, alwaysFail));
    assert.strictEqual(recording.batchCompleteArguments.length, expected.batchCompleteCount);
    assert.deepStrictEqual(recording.batchCompleteArguments[0], expected.stats);
  }

  static async 'process-settled-batch-complete'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'process-settled-batch-complete'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    const failOnErrorItems = async (item: number): Promise<number> => {
      const settled = await Promise.resolve(item);
      if (input.errorItems.includes(settled)) {
        throw RuntimeError.create(input.errorMessage);
      }
      return settled;
    };
    await BatchCollector.collect(recording.processSettled(input.items, failOnErrorItems));
    assert.strictEqual(recording.batchCompleteArguments.length, expected.batchCompleteCount);
    assert.deepStrictEqual(recording.batchCompleteArguments[0], expected.stats);
  }

  static async 'process-settled-batch-start'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'process-settled-batch-start'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    await BatchCollector.collect(recording.processSettled(input.items, BatchHooksRunners.identity));
    assert.strictEqual(recording.batchStartArguments.length, expected.batchStartCount);
    assert.strictEqual(recording.batchStartArguments[0], expected.total);
  }

  static async 'process-settled-indices'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'process-settled-indices'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<string>(input.batch.maximumConcurrent);
    await BatchCollector.collect(recording.processSettled(input.items, BatchHooksRunners.uppercase));
    assert.deepStrictEqual(BatchHooksRunners.sortedNumbers(recording.itemStartArguments), expected.sortedIndices);
    assert.deepStrictEqual(BatchHooksRunners.sortedNumbers(recording.itemSettledArguments), expected.sortedSettledIndices);
    assert.deepStrictEqual(BatchHooksRunners.sortedSuccessResults(recording.itemSuccessArguments), expected.sortedResults);
  }

  static async 'process-settled-item-settled'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'process-settled-item-settled'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    await BatchCollector.collect(recording.processSettled(input.items, BatchHooksRunners.failOn(input.errorItem, input.errorMessage)));
    assert.strictEqual(recording.itemSettledArguments.length, expected.itemSettledCount);
  }

  static async 'process-settled-item-success-error'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'process-settled-item-success-error'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    const failOrScale = async (item: number): Promise<number> => {
      const settled = await Promise.resolve(item);
      if (settled === input.errorItem) {
        throw RuntimeError.create(input.errorMessage);
      }
      const scaled = settled * 10;
      return scaled;
    };
    await BatchCollector.collect(recording.processSettled(input.items, failOrScale));
    assert.strictEqual(recording.itemSuccessArguments.length, expected.itemSuccessCount);
    assert.strictEqual(recording.itemErrorArguments.length, expected.itemErrorCount);
    assert.strictEqual(recording.itemErrorArguments[0]?.[0], expected.firstErrorIndex);
  }

  static async 'process-settled-saturation'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'process-settled-saturation'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const recording = new RecordingBatch<number>(input.batch.maximumConcurrent);
    await BatchCollector.collect(recording.processSettled(input.items, BatchHooksRunners.identity));
    assert.strictEqual(recording.concurrencySaturatedCount, expected.concurrencySaturatedCount);
  }

  static async 'throwing-complete-hook'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'throwing-complete-hook'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const batch = new ThrowingHookBatch(input.batch.maximumConcurrent, 'onBatchComplete');
    const results = await BatchCollector.collect(batch.processSettled(input.items, BatchHooksRunners.identity));
    const values: (number | undefined)[] = [];
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      assert.ok(result !== undefined);
      assert.strictEqual(result.status, 'fulfilled');
      values.push(result.status === 'fulfilled' ? result.value : undefined);
    }
    assert.deepStrictEqual(values, expected.results);
    assert.strictEqual(batch.recordedHookErrorCount, expected.hookErrorCount);
  }

  static async 'throwing-success-hook'(scenarioCase: ScenarioCaseOfType<BatchHooksScenarioCaseEntity.Type, 'throwing-success-hook'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const batch = new ThrowingHookBatch(input.batch.maximumConcurrent, 'onItemSuccess');
    const results = await BatchCollector.collect(batch.process(input.items, BatchHooksRunners.doubleItem));
    assert.deepStrictEqual(results, expected.results);
    assert.strictEqual(batch.recordedHookErrorCount, expected.hookErrorCount);
  }

  private static assertErrorMessageIncludes(error: Error, expectedMessage: string): void {
    assert.equal(error.message.includes(expectedMessage), true);
  }

  private static async doubleItem(item: number): Promise<number> {
    const doubled = await Promise.resolve(item * 2);
    return doubled;
  }

  private static failOn(errorItem: number, errorMessage: string): (item: number) => Promise<number> {
    const failOnItem = async (item: number): Promise<number> => {
      const settled = await Promise.resolve(item);
      if (settled === errorItem) {
        throw RuntimeError.create(errorMessage);
      }
      return settled;
    };
    return failOnItem;
  }

  private static flushImmediate(): Promise<void> {
    const flushed = new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    return flushed;
  }

  private static async identity<TValue>(value: TValue): Promise<TValue> {
    await Promise.resolve();
    return value;
  }

  private static async rejectAfterTick(message: string): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create(message);
  }

  private static sortedNumbers(values: readonly number[]): number[] {
    const sorted = values.toSorted((left, right) => {
      const difference = left - right;
      return difference;
    });
    return sorted;
  }

  private static sortedSuccessResults<TResult>(entries: readonly (readonly [number, TResult])[]): TResult[] {
    const sorted = entries.toSorted((left, right) => {
      const difference = left[0] - right[0];
      return difference;
    });
    const results: TResult[] = [];
    for (let index = 0; index < sorted.length; index += 1) {
      const entry = sorted[index];
      assert.ok(entry !== undefined);
      results.push(entry[1]);
    }
    return results;
  }

  private static statusesOf(results: readonly PromiseSettledResult<unknown>[]): string[] {
    const statuses: string[] = [];
    for (let index = 0; index < results.length; index += 1) {
      statuses.push(String(results[index]?.status));
    }
    return statuses;
  }

  private static async uppercase(value: string): Promise<string> {
    const upper = await Promise.resolve(value.toUpperCase());
    return upper;
  }
}

ScenarioSuite.register({
  'entity': BatchHooksScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Batch hooks',
  'runners': BatchHooksRunners
});
