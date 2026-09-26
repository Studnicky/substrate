import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Batch } from '../../../src/batch/Batch.js';
import { DEFAULT_BATCH_MAXIMUM_CONCURRENT } from '../../../src/constants/index.js';
import { collectBatches, delay } from '../../helpers/index.js';
import { BatchScenarioCaseEntity } from './entities/BatchScenarioCaseEntity.js';
import scenarioGroups from './batch.scenarios.json' with { type: 'json' };

type ScenarioCase = BatchScenarioCaseEntity.Type;
type ScenarioShape = ScenarioCase['shape'];
type ScenarioRunner<K extends ScenarioShape> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void> | void;
type RunnerMap = { [K in ScenarioShape]: ScenarioRunner<K> };

function createScenarioBatch<TResult = unknown>(input: { batch: { maxConcurrent?: number } }): Batch<TResult> {
  return Batch.create<TResult>(input.batch.maxConcurrent);
}

function assertErrorMessageIncludes(error: Error, expectedMessage: string): void {
  assert.equal(error.message.includes(expectedMessage), true);
}

const runnerMap: RunnerMap = {
  'process-empty': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const batches: number[][] = [];
    for await (const batch of createScenarioBatch<number>(input).process(input.items, async (item) => item * 2)) {
      batches.push(batch);
    }
    assert.deepStrictEqual(batches, expected.batches);
  },

  'process-single-batch': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const batches: number[][] = [];
    for await (const batch of createScenarioBatch<number>(input).process(input.items, async (item) => item * 2)) {
      batches.push(batch);
    }
    assert.deepStrictEqual(batches, expected.batches);
  },

  'process-single-batch-concurrent': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const executionOrder: number[] = [];
    for await (const batch of createScenarioBatch<number>(input).process(
      input.items,
      async (item) => {
        executionOrder.push(item);
        await delay(input.delayMs);
        return item * 2;
      }
    )) {
      assert.deepStrictEqual(batch, input.items.map((n) => n * 2));
    }
    assert.strictEqual(executionOrder.length, expected.executionCount);
  },

  'process-multi-batch': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const batches: number[][] = [];
    for await (const batch of createScenarioBatch<number>(input).process(
      input.items,
      async (item) => {
        await delay(input.delayMs);
        return item * 2;
      }
    )) {
      batches.push(batch);
    }
    assert.deepStrictEqual(batches, expected.batches);
  },

  'process-invalid-max-concurrent': (scenarioCase) => {
    const { input, expected } = scenarioCase;
    assert.throws(() => { createScenarioBatch<number>(input); }, (error: Error) => {
      assertErrorMessageIncludes(error, expected.message);
      return true;
    });
  },

  'process-order': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const generator = createScenarioBatch<number>(input).process(
      input.items,
      async (item) => {
        const index = input.items.indexOf(item);
        await delay(input.delays[index]!);
        return item * 10;
      }
    );
    const allResults = await collectBatches(generator);
    assert.deepStrictEqual(allResults, expected.results);
  },

  'process-default-max-concurrent': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    assert.strictEqual(DEFAULT_BATCH_MAXIMUM_CONCURRENT, expected.defaultMaxConcurrent);
    let maxConcurrentObserved = 0;
    let currentConcurrent = 0;
    for await (const batch of createScenarioBatch<number>(input).process(
      input.items,
      async (item) => {
        currentConcurrent += 1;
        if (currentConcurrent > maxConcurrentObserved) {
          maxConcurrentObserved = currentConcurrent;
        }
        await delay(10);
        currentConcurrent -= 1;
        return item;
      }
    )) {
      assert.ok(batch.length > 0);
    }
    assert.strictEqual(maxConcurrentObserved, expected.maxConcurrentObserved);
  },

  'process-waits-for-batch-completion': async (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const maxConcurrent = input.batch.maxConcurrent;
    if (maxConcurrent === undefined) {
      throw RuntimeError.create('Scenario input.batch.maxConcurrent is required');
    }
    const batchTimestamps: number[] = [];
    const startTime = Date.now();
    for await (const batch of createScenarioBatch<number>(input).process(input.items, async (item) => {
      await delay(input.delayMs);
      return item;
    })) {
      assert.strictEqual(batch.length, maxConcurrent);
      batchTimestamps.push(Date.now() - startTime);
    }
    assert.strictEqual(batchTimestamps.length, expected.batchCount);
    const first = batchTimestamps[0];
    const second = batchTimestamps[1];
    if (first === undefined || second === undefined) {
      throw RuntimeError.create('Expected two batch timestamps');
    }
    assert.ok(second - first >= expected.minGapMs);
  },

  'process-propagates-errors': (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const consumeGenerator = async (): Promise<void> => {
      for await (const batch of createScenarioBatch<number>(input).process(input.items, async (item) => {
        if (item === input.errorItem) {
          throw RuntimeError.create(input.errorMessage);
        }
        return item;
      })) {
        assert.ok(Array.isArray(batch));
      }
    };
    return assert.rejects(consumeGenerator, (error: Error) => {
      assertErrorMessageIncludes(error, expected.rejectedMessage);
      return true;
    });
  },

  'process-stops-on-first-error': (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const processed: number[] = [];
    const batchesReceived: number[][] = [];

    const consumeGenerator = async (): Promise<void> => {
      for await (const batch of createScenarioBatch<number>(input).process(input.items, async (item) => {
        processed.push(item);
        await delay(10);
        if (item === input.errorItem) {
          throw RuntimeError.create(input.errorMessage);
        }
        return item;
      })) {
        batchesReceived.push(batch);
      }
    };

    return assert.rejects(consumeGenerator, (error: Error) => {
      assertErrorMessageIncludes(error, expected.rejectedMessage);
      return true;
    }).then(() => {
      assert.deepStrictEqual(processed, expected.processed);
      assert.deepStrictEqual(batchesReceived, expected.batches);
    });
  },

  'process-returns-results': (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const batch = createScenarioBatch<number>(input);
    return collectBatches(batch.process(input.items, async (n) => n * 2)).then((results) => {
      assert.deepStrictEqual(results, expected.results);
    });
  },

  'process-settled-returns-results': (scenarioCase) => {
    const { input, expected } = scenarioCase;
    const batch = createScenarioBatch<number>(input);
    return collectBatches(batch.processSettled(input.items, async (n) => n * 2)).then((results) => {
      const values = results.map((result) => {
        assert.strictEqual(result.status, 'fulfilled');
        return result.status === 'fulfilled' ? result.value : undefined;
      });
      assert.deepStrictEqual(values, expected.results);
    });
  }
};

function runCase<K extends ScenarioShape>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> | void {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

const fileIntake = ScenarioFileCompiler.compileIntake(BatchScenarioCaseEntity.Schema, BatchScenarioCaseEntity.Node);

void describe('Batch', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
