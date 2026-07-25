import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Batch } from '@studnicky/batch';

import { Throttle, ThrottleStatsEntity } from '../../../src/index.js';
import scenarioGroups from './state-management.scenarios.json';

interface BatchInputInterface {
  itemCount: number;
  maxConcurrent: number;
  operationDelayMs?: number;
}

type ScenarioCase =
  | {
      name: string;
      description: string;
      expected: Record<string, unknown>;
      input: {
        batch?: BatchInputInterface;
        result?: string;
        throttle: Parameters<typeof Throttle.create>[0];
      };
      kind: 'adaptive-latency-stats' | 'adaptive-scales-down' | 'adaptive-scales-up' | 'initial-stats' | 'is-complete-initially';
    };

function requireBatchInput(input: ScenarioCase['input']): BatchInputInterface {
  assert.ok(input.batch !== undefined);
  return input.batch;
}

function createScenarioBatch<TResult>(input: BatchInputInterface): Batch<TResult> {
  return Batch.create<TResult>(input.maxConcurrent);
}

async function waitForBatchOperationDelay(input: BatchInputInterface): Promise<void> {
  if (input.operationDelayMs !== undefined) {
    await new Promise((resolve) => { setTimeout(resolve, input.operationDelayMs); });
  }
}

async function executeIndexedWork(throttle: Throttle, input: ScenarioCase['input']): Promise<number[]> {
  const batch = requireBatchInput(input);
  const items = Array.from({ length: batch.itemCount }, (_unused, index) => index);
  const workload = createScenarioBatch<number | undefined>(batch);
  const results: Array<number | undefined> = [];

  for await (const batchResults of workload.process(items, async (index) => {
    return await throttle.execute(async () => {
      await waitForBatchOperationDelay(batch);
      return index;
    });
  })) {
    results.push(...batchResults);
  }

  return results.filter((result): result is number => result !== undefined);
}

const runnerMap: Record<ScenarioCase['kind'], (scenarioCase: ScenarioCase) => Promise<void> | void> = {
  'adaptive-latency-stats': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const throttle = Throttle.create(input.throttle);

    const result = await throttle.execute(async () => {
      return String(input.result);
    });

    assert.strictEqual(result, String(expected.result));
    const stats = throttle.getStats();
    assert.ok(stats.latency !== undefined);
    assert.strictEqual(stats.latency?.sampleCount, Number(expected.sampleCount));
  },
  'adaptive-scales-down': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const throttle = Throttle.create(input.throttle);
    const results = await executeIndexedWork(throttle, input);

    assert.strictEqual(results.length, Number(expected.resultCount));
    assert.strictEqual(throttle.getStats().concurrencyLimit, Number(expected.concurrencyLimit));
  },
  'adaptive-scales-up': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const throttle = Throttle.create(input.throttle);
    const results = await executeIndexedWork(throttle, input);

    assert.strictEqual(results.length, Number(expected.resultCount));
    assert.strictEqual(throttle.getStats().concurrencyLimit, Number(expected.concurrencyLimit));
  },
  'initial-stats': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const throttle = Throttle.create(input.throttle);
    const stats = throttle.getStats();
    assert.deepStrictEqual(stats, expected.stats);
    assert.strictEqual(ThrottleStatsEntity.validate(stats), Boolean(expected.isComplete));
  },
  'is-complete-initially': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const throttle = Throttle.create(input.throttle);
    assert.strictEqual(throttle.isComplete(), Boolean(expected.isComplete));
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('Throttle state management', () => {
  for (const scenarioCase of scenarioGroups.cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
