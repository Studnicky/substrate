import { RuntimeError, HookInvocationError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BatchStatsEntity } from '../../../src/entities/BatchStatsEntity.js';

import { Batch } from '../../../src/batch/Batch.js';
import { collectBatches } from '../../helpers/index.js';
import { BatchHooksScenarioCaseEntity } from './entities/BatchHooksScenarioCaseEntity.js';
import scenarioGroups from './batchHooks.scenarios.json' with { type: 'json' };

type ScenarioCase = BatchHooksScenarioCaseEntity.Type;
type ScenarioShape = ScenarioCase['shape'];
type ScenarioRunner<K extends ScenarioShape> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void> | void;
type RunnerMap = { [K in ScenarioShape]: ScenarioRunner<K> };

class RecordingBatch<TResult = unknown> extends Batch<TResult> {
  public constructor(maxConcurrent?: number) { super(maxConcurrent); }

  public batchStartArgs: number[] = [];
  public itemStartArgs: number[] = [];
  public itemSuccessArgs: Array<[number, TResult]> = [];
  public itemErrorArgs: Array<[number, Error]> = [];
  public itemSettledArgs: number[] = [];
  public concurrencySaturatedCount = 0;
  public batchCompleteArgs: BatchStatsEntity.Type[] = [];

  protected override onBatchStart(total: number): void { this.batchStartArgs.push(total); }
  protected override onConcurrencySaturated(): void { this.concurrencySaturatedCount += 1; }
  protected override onItemStart(index: number): void { this.itemStartArgs.push(index); }
  protected override onItemSuccess(index: number, result: TResult): void { this.itemSuccessArgs.push([index, result]); }
  protected override onItemError(index: number, error: Error): void { this.itemErrorArgs.push([index, error]); }
  protected override onItemSettled(index: number): void { this.itemSettledArgs.push(index); }
  protected override onBatchComplete(stats: BatchStatsEntity.Type): void { this.batchCompleteArgs.push(stats); }
}

function createRecordingBatch<TResult = unknown>(input: { batch: { maxConcurrent?: number } }): RecordingBatch<TResult> {
  return new RecordingBatch<TResult>(input.batch.maxConcurrent);
}

function assertErrorMessageIncludes(error: Error, expectedMessage: string): void {
  assert.equal(error.message.includes(expectedMessage), true);
}

const runnerMap: RunnerMap = {
  'on-batch-start': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.process(input.items, async (n) => n));
    assert.strictEqual(rec.batchStartArgs.length, expected.batchStartCount);
    assert.strictEqual(rec.batchStartArgs[0], expected.total);
  },

  'on-item-start': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.process(input.items, async (n) => n));
    assert.strictEqual(rec.itemStartArgs.length, expected.itemStartCount);
    assert.deepStrictEqual(rec.itemStartArgs.slice().toSorted((a, b) => a - b), expected.sortedIndices);
  },

  'on-item-success': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.process(input.items, async (n) => n * 2));
    assert.strictEqual(rec.itemSuccessArgs.length, expected.itemSuccessCount);
    const sorted = rec.itemSuccessArgs.slice().toSorted((a, b) => a[0] - b[0]);
    assert.deepStrictEqual(sorted.map((entry) => entry[1]), expected.sortedResults);
  },

  'on-item-error': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    const run = async (): Promise<void> => {
      await collectBatches(rec.process(input.items, async (n) => {
        if (n === input.errorItem) { throw RuntimeError.create(input.errorMessage); }
        return n;
      }));
    };
    await assert.rejects(run, (error: Error) => {
      assertErrorMessageIncludes(error, expected.rejectedMessage);
      return true;
    });
    assert.strictEqual(rec.itemErrorArgs.length, expected.itemErrorCount);
    assert.strictEqual(rec.itemErrorArgs[0]![0], expected.firstErrorIndex);
  },

  'on-item-settled': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    const run = async (): Promise<void> => {
      await collectBatches(rec.process(input.items, async (n) => {
        if (n === input.errorItem) { throw RuntimeError.create(input.errorMessage); }
        return n;
      }));
    };
    await assert.rejects(run, (error: Error) => {
      assertErrorMessageIncludes(error, expected.rejectedMessage);
      return true;
    });
    assert.strictEqual(rec.itemSettledArgs.length, expected.itemSettledCount);
  },

  'on-item-success-order': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const order: string[] = [];
    class OrderBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      protected override onItemSuccess(index: number): void { order.push(`success-${index}`); }
      protected override onItemSettled(index: number): void { order.push(`settled-${index}`); }
    }
    const batch = new OrderBatch(input.batch.maxConcurrent);
    await collectBatches(batch.process(input.items, async (n) => n));
    assert.deepStrictEqual(order, expected.order);
  },

  'on-item-error-order': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const order: string[] = [];
    class OrderBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      protected override onItemError(index: number): void { order.push(`error-${index}`); }
      protected override onItemSettled(index: number): void { order.push(`settled-${index}`); }
    }
    const batch = new OrderBatch(input.batch.maxConcurrent);
    const run = async (): Promise<void> => {
      await collectBatches(batch.process(input.items, async () => { throw RuntimeError.create(input.errorMessage); }));
    };
    await assert.rejects(run, (error: Error) => {
      assertErrorMessageIncludes(error, expected.rejectedMessage);
      return true;
    });
    assert.deepStrictEqual(order, expected.order);
  },

  'on-concurrency-saturated': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.process(input.items, async (n) => n));
    assert.strictEqual(rec.concurrencySaturatedCount, expected.concurrencySaturatedCount);
  },

  'on-batch-complete': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.process(input.items, async (n) => n));
    assert.strictEqual(rec.batchCompleteArgs.length, expected.batchCompleteCount);
    assert.deepStrictEqual(rec.batchCompleteArgs[0], expected.stats);
  },

  'on-batch-complete-abort': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    const run = async (): Promise<void> => {
      await collectBatches(rec.process(input.items, async (n) => {
        if (n === input.errorItem) { throw RuntimeError.create(input.errorMessage); }
        return n;
      }));
    };
    await assert.rejects(run, (error: Error) => {
      assertErrorMessageIncludes(error, expected.rejectedMessage);
      return true;
    });
    assert.strictEqual(rec.batchCompleteArgs.length, expected.batchCompleteCount);
  },

  'process-settled-batch-start': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.processSettled(input.items, async (n) => n));
    assert.strictEqual(rec.batchStartArgs.length, expected.batchStartCount);
    assert.strictEqual(rec.batchStartArgs[0], expected.total);
  },

  'process-settled-item-success-error': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.processSettled(input.items, async (n) => {
      if (n === input.errorItem) { throw RuntimeError.create(input.errorMessage); }
      return n * 10;
    }));
    assert.strictEqual(rec.itemSuccessArgs.length, expected.itemSuccessCount);
    assert.strictEqual(rec.itemErrorArgs.length, expected.itemErrorCount);
    assert.strictEqual(rec.itemErrorArgs[0]![0], expected.firstErrorIndex);
  },

  'process-settled-item-settled': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.processSettled(input.items, async (n) => {
      if (n === input.errorItem) { throw RuntimeError.create(input.errorMessage); }
      return n;
    }));
    assert.strictEqual(rec.itemSettledArgs.length, expected.itemSettledCount);
  },

  'process-settled-batch-complete': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.processSettled(input.items, async (n) => {
      if (input.errorItems.includes(n)) { throw RuntimeError.create(input.errorMessage); }
      return n;
    }));
    assert.strictEqual(rec.batchCompleteArgs.length, expected.batchCompleteCount);
    assert.deepStrictEqual(rec.batchCompleteArgs[0], expected.stats);
  },

  'process-settled-saturation': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.processSettled(input.items, async (n) => n));
    assert.strictEqual(rec.concurrencySaturatedCount, expected.concurrencySaturatedCount);
  },

  'process-settled-indices': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<string>(input);
    await collectBatches(rec.processSettled(input.items, async (value) => value.toUpperCase()));
    assert.deepStrictEqual(rec.itemStartArgs.slice().toSorted((a, b) => a - b), expected.sortedIndices);
    assert.deepStrictEqual(rec.itemSettledArgs.slice().toSorted((a, b) => a - b), expected.sortedSettledIndices);
    assert.deepStrictEqual(rec.itemSuccessArgs.slice().toSorted((a, b) => a[0] - b[0]).map((entry) => entry[1]), expected.sortedResults);
  },

  'process-settled-all-fail': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const rec = createRecordingBatch<number>(input);
    await collectBatches(rec.processSettled(input.items, async () => { throw RuntimeError.create(input.errorMessage); }));
    assert.strictEqual(rec.batchCompleteArgs.length, expected.batchCompleteCount);
    assert.deepStrictEqual(rec.batchCompleteArgs[0], expected.stats);
  },

  'throwing-success-hook': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class ThrowingSuccessBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      protected override onItemSuccess(): void {
        throw RuntimeError.create('hook boom');
      }
      public getRecordedHookErrorCount(): number { return this.hooks.hookErrorCount; }
    }
    const batch = new ThrowingSuccessBatch(input.batch.maxConcurrent);
    return collectBatches(batch.process(input.items, async (n) => n * 2)).then((results) => {
      assert.deepStrictEqual(results, expected.results);
      assert.strictEqual(batch.getRecordedHookErrorCount(), expected.hookErrorCount);
    });
  },

  'throwing-complete-hook': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class ThrowingCompleteBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      protected override onBatchComplete(): void {
        throw RuntimeError.create('hook boom');
      }
      public getRecordedHookErrorCount(): number { return this.hooks.hookErrorCount; }
    }
    const batch = new ThrowingCompleteBatch(input.batch.maxConcurrent);
    return collectBatches(batch.processSettled(input.items, async (n) => n)).then((results) => {
      const values = results.map((result) => {
        assert.strictEqual(result.status, 'fulfilled');
        return result.status === 'fulfilled' ? result.value : undefined;
      });
      assert.deepStrictEqual(values, expected.results);
      assert.strictEqual(batch.getRecordedHookErrorCount(), expected.hookErrorCount);
    });
  },

  'continue-on-hook-error': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class FlakyHooksBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      public get recordedHookErrorCount(): number { return this.hooks.hookErrorCount; }
      public get recordedHookErrors(): readonly HookInvocationError[] { return this.hooks.getHookErrors(); }

      protected override onItemSuccess(index: number): void {
        if (index === input.successHookErrorIndex) { throw RuntimeError.create(`onItemSuccess boom for index ${index}`); }
      }
      protected override onItemError(index: number): void {
        if (index === input.errorHookErrorIndex) { throw RuntimeError.create(`onItemError boom for index ${index}`); }
      }
    }

    const batch = new FlakyHooksBatch(input.batch.maxConcurrent);
    return collectBatches(batch.processSettled(input.items, async (n) => {
      if (n === input.errorItem) { throw RuntimeError.create(input.operationErrorMessage); }
      return n;
    })).then((results) => {
      assert.strictEqual(results.length, expected.statuses.length);
      assert.deepStrictEqual(results.map((result) => result.status), expected.statuses);
      assert.strictEqual(batch.recordedHookErrorCount, expected.hookErrorCount);
      assert.strictEqual(batch.recordedHookErrors.length, expected.hookErrorCount);
    });
  },

  'async-hook-error-safe': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class AsyncRejectingBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      public get recordedHookErrorCount(): number { return this.hooks.hookErrorCount; }
      public get recordedHookErrors(): readonly HookInvocationError[] { return this.hooks.getHookErrors(); }

      protected override async onItemSuccess(_index: number, _result: number): Promise<void> {
        await Promise.resolve();
        throw RuntimeError.create(input.hookErrorMessage);
      }
    }

    const batch = new AsyncRejectingBatch(input.batch.maxConcurrent);
    const rejectionEvents: Error[] = [];
    const onUnhandledRejection = (reason: Error): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    return collectBatches(batch.processSettled(input.items, async (n) => n))
      .then((results) => {
        assert.deepStrictEqual(results.map((r) => r.status), expected.statuses);
      })
      .then(() => new Promise((resolve) => { setImmediate(resolve); }))
      .then(() => new Promise((resolve) => { setImmediate(resolve); }))
      .then(() => {
        assert.strictEqual(rejectionEvents.length, expected.unhandledRejections);
        assert.strictEqual(batch.recordedHookErrorCount, expected.hookErrorCount);
        assert.strictEqual(batch.recordedHookErrors.length, expected.hookErrorCount);
      })
      .finally(() => {
        process.off('unhandledRejection', onUnhandledRejection);
      });
  },

  'hook-errors-owned-by-instance': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    class IsolatedFailureBatch extends Batch<number> {
      public constructor(maxConcurrent?: number) { super(maxConcurrent); }
      public getRecordedHookErrorCount(): number {
        return this.hooks.hookErrorCount;
      }

      public getRecordedHookErrors(): readonly HookInvocationError[] {
        return this.hooks.getHookErrors();
      }

      protected override onItemSuccess(_index: number, result: number): void {
        throw RuntimeError.create(`hook failure for ${String(result)}`);
      }
    }

    const first = new IsolatedFailureBatch(input.batch.maxConcurrent);
    const second = new IsolatedFailureBatch(input.batch.maxConcurrent);
    await collectBatches(first.process([input.firstItem], async (value) => value));
    await collectBatches(second.process([input.secondItem], async (value) => value));
    const firstError = first.getRecordedHookErrors()[0];
    const secondError = second.getRecordedHookErrors()[0];
    assert.equal(first.getRecordedHookErrorCount(), expected.firstHookErrorCount);
    assert.equal(second.getRecordedHookErrorCount(), expected.secondHookErrorCount);
    assert.ok(firstError instanceof HookInvocationError);
    assert.ok(secondError instanceof HookInvocationError);
    assert.equal(firstError.hookName, 'onItemSuccess');
    assert.equal(secondError.hookName, 'onItemSuccess');
    assert.ok(firstError.cause instanceof Error);
    assert.ok(secondError.cause instanceof Error);
    assert.equal(firstError.cause.message, expected.firstCauseMessage);
    assert.equal(secondError.cause.message, expected.secondCauseMessage);
  }
};

function runCase<K extends ScenarioShape>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> | void {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

const fileIntake = ScenarioFileCompiler.compileIntake(BatchHooksScenarioCaseEntity.Schema, BatchHooksScenarioCaseEntity.Node);

void describe('Batch hooks', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
