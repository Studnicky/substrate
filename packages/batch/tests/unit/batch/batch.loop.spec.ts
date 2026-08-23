import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Batch } from '../../../src/batch/Batch.js';
import { DEFAULT_BATCH_MAXIMUM_CONCURRENT } from '../../../src/constants/index.js';
import { collectBatches, delay } from '../../helpers/index.js';
import scenarioGroups from './batch.scenarios.json' with { type: 'json' };

type ScenarioInput = Record<string, unknown> & { batch?: { maxConcurrent?: number } };

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; name: string; shape: 'process-empty' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; name: string; shape: 'process-single-batch' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; name: string; shape: 'process-single-batch-concurrent' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; name: string; shape: 'process-multi-batch' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; name: string; shape: 'process-invalid-max-concurrent' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; name: string; shape: 'process-order' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; name: string; shape: 'process-default-max-concurrent' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; name: string; shape: 'process-waits-for-batch-completion' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; name: string; shape: 'process-propagates-errors' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; name: string; shape: 'process-stops-on-first-error' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; name: string; shape: 'process-returns-results' }
  | { description: string; expected: Record<string, unknown>; input: ScenarioInput; name: string; shape: 'process-settled-returns-results' };

type ScenarioShape = ScenarioCase['shape'];
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

function resolveBatchMaxConcurrent(input: ScenarioInput): number | undefined {
  const maxConcurrent = input.batch?.maxConcurrent;
  return maxConcurrent === undefined ? undefined : Number(maxConcurrent);
}

function requireBatchMaxConcurrent(input: ScenarioInput): number {
  const maxConcurrent = resolveBatchMaxConcurrent(input);
  if (maxConcurrent === undefined) {
    throw new Error('Scenario input.batch.maxConcurrent is required');
  }
  return maxConcurrent;
}

function createScenarioBatch<TResult = unknown>(input: ScenarioInput): Batch<TResult> {
  return Batch.create<TResult>(resolveBatchMaxConcurrent(input));
}

function assertErrorMessageIncludes(error: unknown, expectedMessage: string): void {
  assert.ok(error instanceof Error);
  assert.equal(error.message.includes(expectedMessage), true);
}

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'process-empty': async (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const batches: number[][] = [];
    for await (const batch of createScenarioBatch<number>(input).process(input.items as number[], async (item: number) => item * 2)) {
      batches.push(batch);
    }
    assert.deepStrictEqual(batches, expected.batches);
  },

  'process-single-batch': async (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const batches: number[][] = [];
    for await (const batch of createScenarioBatch<number>(input).process(
      input.items as number[],
      async (item) => item * 2
    )) {
      batches.push(batch);
    }
    assert.deepStrictEqual(batches, expected.batches);
  },

  'process-single-batch-concurrent': async (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const executionOrder: number[] = [];
    for await (const batch of createScenarioBatch<number>(input).process(
      input.items as number[],
      async (item) => {
        executionOrder.push(item);
        await delay(Number(input.delayMs));
        return item * 2;
      }
    )) {
      assert.deepStrictEqual(batch, (input.items as number[]).map((n) => n * 2));
    }
    assert.strictEqual(executionOrder.length, Number(expected.executionCount));
  },

  'process-multi-batch': async (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const batches: number[][] = [];
    for await (const batch of createScenarioBatch<number>(input).process(
      input.items as number[],
      async (item) => {
        await delay(Number(input.delayMs));
        return item * 2;
      }
    )) {
      batches.push(batch);
    }
    assert.deepStrictEqual(batches, expected.batches);
  },

  'process-invalid-max-concurrent': (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    assert.throws(() => { createScenarioBatch<number>(input); }, (error: unknown) => {
      assertErrorMessageIncludes(error, String(expected.message));
      return true;
    });
  },

  'process-order': async (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const generator = createScenarioBatch<number>(input).process(
      input.items as number[],
      async (item) => {
        const index = (input.items as number[]).indexOf(item);
        await delay((input.delays as number[])[index]!);
        return item * 10;
      }
    );
    const allResults = await collectBatches(generator);
    assert.deepStrictEqual(allResults, expected.results);
  },

  'process-default-max-concurrent': async (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    assert.strictEqual(DEFAULT_BATCH_MAXIMUM_CONCURRENT, Number(expected.defaultMaxConcurrent));
    const items = input.items as number[];
    let maxConcurrentObserved = 0;
    let currentConcurrent = 0;
    for await (const batch of createScenarioBatch<number>(input).process(
      items,
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
    assert.strictEqual(maxConcurrentObserved, Number(expected.maxConcurrentObserved));
  },

  'process-waits-for-batch-completion': async (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const items = input.items as number[];
    const batchTimestamps: number[] = [];
    const startTime = Date.now();
    for await (const batch of createScenarioBatch<number>(input).process(items, async (item) => {
      await delay(Number(input.delayMs));
      return item;
    })) {
      assert.strictEqual(batch.length, requireBatchMaxConcurrent(input));
      batchTimestamps.push(Date.now() - startTime);
    }
    assert.strictEqual(batchTimestamps.length, Number(expected.batchCount));
    const first = batchTimestamps[0];
    const second = batchTimestamps[1];
    if (first === undefined || second === undefined) {
      throw new Error('Expected two batch timestamps');
    }
    assert.ok(second - first >= Number(expected.minGapMs));
  },

  'process-propagates-errors': (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const items = input.items as number[];
    const consumeGenerator = async (): Promise<void> => {
      for await (const batch of createScenarioBatch<number>(input).process(items, async (item) => {
        if (item === Number(input.errorItem)) {
          throw new Error(String(input.errorMessage));
        }
        return item;
      })) {
        assert.ok(Array.isArray(batch));
      }
    };
    return assert.rejects(consumeGenerator, (error: unknown) => {
      assertErrorMessageIncludes(error, String(expected.rejectedMessage));
      return true;
    });
  },

  'process-stops-on-first-error': (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const items = input.items as number[];
    const processed: number[] = [];
    const batchesReceived: number[][] = [];

    const consumeGenerator = async (): Promise<void> => {
      for await (const batch of createScenarioBatch<number>(input).process(items, async (item) => {
        processed.push(item);
        await delay(10);
        if (item === Number(input.errorItem)) {
          throw new Error(String(input.errorMessage));
        }
        return item;
      })) {
        batchesReceived.push(batch);
      }
    };

    return assert.rejects(consumeGenerator, (error: unknown) => {
      assertErrorMessageIncludes(error, String(expected.rejectedMessage));
      return true;
    }).then(() => {
      assert.deepStrictEqual(processed, expected.processed);
      assert.deepStrictEqual(batchesReceived, expected.batches);
    });
  },

  'process-returns-results': (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const batch = createScenarioBatch<number>(input);
    return collectBatches(batch.process(input.items as number[], async (n) => n * 2)).then((results) => {
      assert.deepStrictEqual(results, expected.results);
    });
  },

  'process-settled-returns-results': (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const batch = createScenarioBatch<number>(input);
    return collectBatches(batch.processSettled(input.items as number[], async (n) => n * 2)).then((results) => {
      assert.deepStrictEqual(results.map((r) => (r as PromiseFulfilledResult<number>).value), expected.results);
    });
  }
};

function runCase(scenarioCase: ScenarioCase): Promise<void> | void {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Batch', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
