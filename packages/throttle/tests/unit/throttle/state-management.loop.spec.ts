import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Batch } from '@studnicky/batch';

import { Throttle } from '../../../src/index.js';
import { ThrottleStatsEntity } from '../../../src/entities/index.js';
import type { ThrottleClockInputInterface } from '../../helpers/VirtualClockThrottle.js';
import { VirtualClockThrottle } from '../../helpers/VirtualClockThrottle.js';
import scenarioGroups from './state-management.scenarios.json' with { type: 'json' };

interface BatchInputInterface {
  itemCount: number;
  maxConcurrent: number;
}

type ScenarioCase =
  | {
      name: string;
      description: string;
      expected: Record<string, unknown>;
      input: {
        batch?: BatchInputInterface;
        clock?: ThrottleClockInputInterface;
        result?: string;
        throttle: Parameters<typeof Throttle.create>[0];
      };
      shape: 'adaptive-latency-stats' | 'adaptive-scales-down' | 'adaptive-scales-up' | 'initial-stats' | 'is-complete-initially';
    };

function requireBatchInput(input: ScenarioCase['input']): BatchInputInterface {
  assert.ok(input.batch !== undefined);
  return input.batch;
}

function requireClockInput(input: ScenarioCase['input']): ThrottleClockInputInterface {
  assert.ok(input.clock !== undefined);
  return input.clock;
}

function createScenarioBatch<TResult>(input: BatchInputInterface): Batch<TResult> {
  return Batch.create<TResult>(input.maxConcurrent);
}

async function executeIndexedWork(throttle: VirtualClockThrottle, input: ScenarioCase['input']): Promise<number[]> {
  const batch = requireBatchInput(input);
  const items = Array.from({ length: batch.itemCount }, (_unused, index) => index);
  const workload = createScenarioBatch<number | undefined>(batch);
  const results: Array<number | undefined> = [];

  for await (const batchResults of workload.process(items, async (index) => {
    throttle.advanceOperationStart();
    return await throttle.execute(async () => {
      throttle.advanceOperationDuration();
      return index;
    });
  })) {
    results.push(...batchResults);
  }

  return results.filter((result): result is number => result !== undefined);
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void> | void> = {
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
    const throttle = VirtualClockThrottle.createWithClock(requireClockInput(input), input.throttle);
    const results = await executeIndexedWork(throttle, input);

    assert.strictEqual(results.length, Number(expected.resultCount));
    assert.strictEqual(throttle.getStats().concurrencyLimit, Number(expected.concurrencyLimit));
  },
  'adaptive-scales-up': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const throttle = VirtualClockThrottle.createWithClock(requireClockInput(input), input.throttle);
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
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Throttle state management', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
