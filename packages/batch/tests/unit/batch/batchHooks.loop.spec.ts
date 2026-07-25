import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import type { BatchStatsEntity } from '../../../src/entities/BatchStatsEntity.js';
import { Batch } from '../../../src/batch/Batch.js';
import { collectBatches } from '../../helpers/index.js';
import scenarioGroups from './batchHooks.scenarios.json';

type ScenarioInput = Record<string, unknown> & { batch?: { maxConcurrent?: number } };

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'on-batch-start' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'on-item-start' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'on-item-success' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'on-item-error' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'on-item-settled' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'on-item-success-order' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'on-item-error-order' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'on-concurrency-saturated' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'on-batch-complete' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'on-batch-complete-abort' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'process-settled-batch-start' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'process-settled-item-success-error' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'process-settled-item-settled' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'process-settled-batch-complete' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'process-settled-saturation' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'process-settled-indices' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'process-settled-all-fail' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'throwing-success-hook' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'throwing-complete-hook' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'continue-on-hook-error' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'async-hook-error-safe' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; shape: 'hook-errors-owned-by-instance' };

type ScenarioShape = ScenarioCase['shape'];
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

class RecordingBatch<TResult = unknown> extends Batch<TResult> {
  public constructor(maxConcurrent?: number) { super(maxConcurrent); }

  public batchStartArgs: number[] = [];
  public itemStartArgs: number[] = [];
  public itemSuccessArgs: Array<[number, TResult]> = [];
  public itemErrorArgs: Array<[number, unknown]> = [];
  public itemSettledArgs: number[] = [];
  public concurrencySaturatedCount = 0;
  public batchCompleteArgs: BatchStatsEntity.Type[] = [];

  protected override onBatchStart(total: number): void { this.batchStartArgs.push(total); }
  protected override onConcurrencySaturated(): void { this.concurrencySaturatedCount += 1; }
  protected override onItemStart(index: number): void { this.itemStartArgs.push(index); }
  protected override onItemSuccess(index: number, result: TResult): void { this.itemSuccessArgs.push([index, result]); }
  protected override onItemError(index: number, error: unknown): void { this.itemErrorArgs.push([index, error]); }
  protected override onItemSettled(index: number): void { this.itemSettledArgs.push(index); }
  protected override onBatchComplete(stats: BatchStatsEntity.Type): void { this.batchCompleteArgs.push(stats); }
}

function resolveBatchMaxConcurrent(input: ScenarioInput): number | undefined {
  const maxConcurrent = input.batch?.maxConcurrent;
  return maxConcurrent === undefined ? undefined : Number(maxConcurrent);
}

function createRecordingBatch<TResult = unknown>(input: ScenarioInput): RecordingBatch<TResult> {
  return new RecordingBatch<TResult>(resolveBatchMaxConcurrent(input));
}

function assertErrorMessageIncludes(error: unknown, expectedMessage: string): void {
  assert.ok(error instanceof Error);
  assert.equal(error.message.includes(expectedMessage), true);
}

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'on-batch-start': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.process(input.items as number[], async (n) => n));
    assert.strictEqual(rec.batchStartArgs.length, Number(expected.batchStartCount));
    assert.strictEqual(rec.batchStartArgs[0], Number(expected.total));
  },

  'on-item-start': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.process(input.items as number[], async (n) => n));
    assert.strictEqual(rec.itemStartArgs.length, Number(expected.itemStartCount));
    assert.deepStrictEqual(rec.itemStartArgs.slice().sort((a, b) => a - b), expected.sortedIndices);
  },

  'on-item-success': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.process(input.items as number[], async (n) => n * 2));
    assert.strictEqual(rec.itemSuccessArgs.length, Number(expected.itemSuccessCount));
    const sorted = rec.itemSuccessArgs.slice().sort((a, b) => a[0] - b[0]);
    assert.deepStrictEqual(sorted.map((entry) => entry[1]), expected.sortedResults);
  },

  'on-item-error': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    const run = async (): Promise<void> => {
      await collectBatches(rec.process(input.items as number[], async (n) => {
        if (n === Number(input.errorItem)) { throw new Error(String(input.errorMessage)); }
        return n;
      }));
    };
    await assert.rejects(run, (error: unknown) => {
      assertErrorMessageIncludes(error, String(expected.rejectedMessage));
      return true;
    });
    assert.strictEqual(rec.itemErrorArgs.length, Number(expected.itemErrorCount));
    assert.strictEqual(rec.itemErrorArgs[0]![0], Number(expected.firstErrorIndex));
  },

  'on-item-settled': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    const run = async (): Promise<void> => {
      await collectBatches(rec.process(input.items as number[], async (n) => {
        if (n === Number(input.errorItem)) { throw new Error(String(input.errorMessage)); }
        return n;
      }));
    };
    await assert.rejects(run, (error: unknown) => {
      assertErrorMessageIncludes(error, String(expected.rejectedMessage));
      return true;
    });
    assert.strictEqual(rec.itemSettledArgs.length, Number(expected.itemSettledCount));
  },

  'on-item-success-order': async ({ expected, input }) => {
    const order: string[] = [];
    class OrderBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      protected override onItemSuccess(index: number): void { order.push(`success-${index}`); }
      protected override onItemSettled(index: number): void { order.push(`settled-${index}`); }
    }
    const batch = new OrderBatch(resolveBatchMaxConcurrent(input));
    await collectBatches(batch.process(input.items as number[], async (n) => n));
    assert.deepStrictEqual(order, expected.order);
  },

  'on-item-error-order': async ({ expected, input }) => {
    const order: string[] = [];
    class OrderBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      protected override onItemError(index: number): void { order.push(`error-${index}`); }
      protected override onItemSettled(index: number): void { order.push(`settled-${index}`); }
    }
    const batch = new OrderBatch(resolveBatchMaxConcurrent(input));
    const run = async (): Promise<void> => {
      await collectBatches(batch.process(input.items as number[], async () => { throw new Error(String(input.errorMessage)); }));
    };
    await assert.rejects(run, (error: unknown) => {
      assertErrorMessageIncludes(error, String(expected.rejectedMessage));
      return true;
    });
    assert.deepStrictEqual(order, expected.order);
  },

  'on-concurrency-saturated': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.process(input.items as number[], async (n) => n));
    assert.strictEqual(rec.concurrencySaturatedCount, Number(expected.concurrencySaturatedCount));
  },

  'on-batch-complete': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.process(input.items as number[], async (n) => n));
    assert.strictEqual(rec.batchCompleteArgs.length, Number(expected.batchCompleteCount));
    assert.deepStrictEqual(rec.batchCompleteArgs[0], expected.stats);
  },

  'on-batch-complete-abort': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    const run = async (): Promise<void> => {
      await collectBatches(rec.process(input.items as number[], async (n) => {
        if (n === Number(input.errorItem)) { throw new Error(String(input.errorMessage)); }
        return n;
      }));
    };
    await assert.rejects(run, (error: unknown) => {
      assertErrorMessageIncludes(error, String(expected.rejectedMessage));
      return true;
    });
    assert.strictEqual(rec.batchCompleteArgs.length, Number(expected.batchCompleteCount));
  },

  'process-settled-batch-start': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.processSettled(input.items as number[], async (n) => n));
    assert.strictEqual(rec.batchStartArgs.length, Number(expected.batchStartCount));
    assert.strictEqual(rec.batchStartArgs[0], Number(expected.total));
  },

  'process-settled-item-success-error': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.processSettled(input.items as number[], async (n) => {
      if (n === Number(input.errorItem)) { throw new Error(String(input.errorMessage)); }
      return n * 10;
    }));
    assert.strictEqual(rec.itemSuccessArgs.length, Number(expected.itemSuccessCount));
    assert.strictEqual(rec.itemErrorArgs.length, Number(expected.itemErrorCount));
    assert.strictEqual(rec.itemErrorArgs[0]![0], Number(expected.firstErrorIndex));
  },

  'process-settled-item-settled': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.processSettled(input.items as number[], async (n) => {
      if (n === Number(input.errorItem)) { throw new Error(String(input.errorMessage)); }
      return n;
    }));
    assert.strictEqual(rec.itemSettledArgs.length, Number(expected.itemSettledCount));
  },

  'process-settled-batch-complete': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.processSettled(input.items as number[], async (n) => {
      if ((input.errorItems as number[]).includes(n)) { throw new Error(String(input.errorMessage)); }
      return n;
    }));
    assert.strictEqual(rec.batchCompleteArgs.length, Number(expected.batchCompleteCount));
    assert.deepStrictEqual(rec.batchCompleteArgs[0], expected.stats);
  },

  'process-settled-saturation': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.processSettled(input.items as number[], async (n) => n));
    assert.strictEqual(rec.concurrencySaturatedCount, Number(expected.concurrencySaturatedCount));
  },

  'process-settled-indices': async ({ expected, input }) => {
    const rec = createRecordingBatch<string>(input);
    await collectBatches(rec.processSettled(input.items as string[], async (value) => value.toUpperCase()));
    assert.deepStrictEqual(rec.itemStartArgs.slice().sort((a, b) => a - b), expected.sortedIndices);
    assert.deepStrictEqual(rec.itemSettledArgs.slice().sort((a, b) => a - b), expected.sortedSettledIndices);
    assert.deepStrictEqual(rec.itemSuccessArgs.slice().sort((a, b) => a[0] - b[0]).map((entry) => entry[1]), expected.sortedResults);
  },

  'process-settled-all-fail': async ({ expected, input }) => {
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.processSettled(input.items as number[], async () => { throw new Error(String(input.errorMessage)); }));
    assert.strictEqual(rec.batchCompleteArgs.length, Number(expected.batchCompleteCount));
    assert.deepStrictEqual(rec.batchCompleteArgs[0], expected.stats);
  },

  'throwing-success-hook': ({ expected, input }) => {
    class ThrowingSuccessBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      protected override onItemSuccess(): void {
        throw new Error('hook boom');
      }
      public getRecordedHookErrorCount(): number { return this.hooks.hookErrorCount; }
    }
    const batch = new ThrowingSuccessBatch(resolveBatchMaxConcurrent(input));
    return collectBatches(batch.process(input.items as number[], async (n) => n * 2)).then((results) => {
      assert.deepStrictEqual(results, expected.results);
      assert.strictEqual(batch.getRecordedHookErrorCount(), Number(expected.hookErrorCount));
    });
  },

  'throwing-complete-hook': ({ expected, input }) => {
    class ThrowingCompleteBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      protected override onBatchComplete(): void {
        throw new Error('hook boom');
      }
      public getRecordedHookErrorCount(): number { return this.hooks.hookErrorCount; }
    }
    const batch = new ThrowingCompleteBatch(resolveBatchMaxConcurrent(input));
    return collectBatches(batch.processSettled(input.items as number[], async (n) => n)).then((results) => {
      assert.deepStrictEqual(results.map((result) => (result as PromiseFulfilledResult<number>).value), expected.results);
      assert.strictEqual(batch.getRecordedHookErrorCount(), Number(expected.hookErrorCount));
    });
  },

  'continue-on-hook-error': ({ expected, input }) => {
    class FlakyHooksBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      public get recordedHookErrorCount(): number { return this.hooks.hookErrorCount; }
      public get recordedHookErrors(): readonly HookInvocationError[] { return this.hooks.getHookErrors(); }

      protected override onItemSuccess(index: number): void {
        if (index === 0) { throw new Error(`onItemSuccess boom for index ${index}`); }
      }
      protected override onItemError(index: number): void {
        if (index === 1) { throw new Error(`onItemError boom for index ${index}`); }
      }
    }

    const batch = new FlakyHooksBatch(resolveBatchMaxConcurrent(input));
    return collectBatches(batch.processSettled(input.items as number[], async (n) => {
      if (n === Number(input.errorItem)) { throw new Error(String(input.operationErrorMessage)); }
      return n;
    })).then((results) => {
      assert.strictEqual(results.length, expected.statuses.length);
      assert.deepStrictEqual(results.map((result) => result.status), expected.statuses);
      assert.strictEqual(batch.recordedHookErrorCount, Number(expected.hookErrorCount));
      assert.strictEqual(batch.recordedHookErrors.length, Number(expected.hookErrorCount));
    });
  },

  'async-hook-error-safe': ({ expected, input }) => {
    class AsyncRejectingBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      public get recordedHookErrorCount(): number { return this.hooks.hookErrorCount; }
      public get recordedHookErrors(): readonly HookInvocationError[] { return this.hooks.getHookErrors(); }

      protected override async onItemSuccess(_index: number, _result: number): Promise<void> {
        await Promise.resolve();
        throw new Error(String(input.hookErrorMessage));
      }
    }

    const batch = new AsyncRejectingBatch(resolveBatchMaxConcurrent(input));
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    return collectBatches(batch.processSettled(input.items as number[], async (n) => n))
      .then((results) => {
        assert.deepStrictEqual(results.map((r) => r.status), expected.statuses);
      })
      .then(() => new Promise((resolve) => { setImmediate(resolve); }))
      .then(() => new Promise((resolve) => { setImmediate(resolve); }))
      .then(() => {
        assert.strictEqual(rejectionEvents.length, Number(expected.unhandledRejections));
        assert.strictEqual(batch.recordedHookErrorCount, Number(expected.hookErrorCount));
        assert.strictEqual(batch.recordedHookErrors.length, Number(expected.hookErrorCount));
      })
      .finally(() => {
        process.off('unhandledRejection', onUnhandledRejection);
      });
  },

  'hook-errors-owned-by-instance': async ({ expected, input }) => {
    class IsolatedFailureBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      public getRecordedHookErrorCount(): number {
        return this.hooks.hookErrorCount;
      }

      public getRecordedHookErrors(): readonly HookInvocationError[] {
        return this.hooks.getHookErrors();
      }

      protected override onItemSuccess(_index: number, result: number): void {
        throw new Error(`hook failure for ${String(result)}`);
      }
    }

    const first = new IsolatedFailureBatch(resolveBatchMaxConcurrent(input));
    const second = new IsolatedFailureBatch(resolveBatchMaxConcurrent(input));
    await collectBatches(first.process([Number(input.firstItem)], async (value) => value));
    await collectBatches(second.process([Number(input.secondItem)], async (value) => value));
    const firstError = first.getRecordedHookErrors()[0];
    const secondError = second.getRecordedHookErrors()[0];
    assert.equal(first.getRecordedHookErrorCount(), Number(expected.firstHookErrorCount));
    assert.equal(second.getRecordedHookErrorCount(), Number(expected.secondHookErrorCount));
    assert.ok(firstError instanceof HookInvocationError);
    assert.ok(secondError instanceof HookInvocationError);
    assert.equal(firstError.hookName, 'onItemSuccess');
    assert.equal(secondError.hookName, 'onItemSuccess');
    assert.ok(firstError.cause instanceof Error);
    assert.ok(secondError.cause instanceof Error);
    assert.equal(firstError.cause.message, String(expected.firstCauseMessage));
    assert.equal(secondError.cause.message, String(expected.secondCauseMessage));
  }
};

function runCase(scenarioCase: ScenarioCase): Promise<void> | void {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Batch hooks', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
