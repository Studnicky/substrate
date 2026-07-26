import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WorkerPool } from '../../src/WorkerPool.js';
import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';
import scenarioGroups from './pooling.scenarios.json' with { type: 'json' };

type ItemType = { ms?: number; value: string };

interface WorkerPoolBatchConfigInputInterface {
  concurrency?: WorkerPoolConfigInterface['batchConcurrency'];
}

interface WorkerPoolInputInterface {
  batch?: WorkerPoolBatchConfigInputInterface;
  concurrency: WorkerPoolConfigInterface['concurrency'];
  workerPath: WorkerPoolConfigInterface['workerPath'];
}

interface WorkloadBatchInputInterface {
  itemCount: number;
  itemMs: number;
  valuePrefix: string;
}

type ScenarioCase = {
  description: string;
  expected: { distinctThreadIdsLessThanItemCount: boolean; distinctThreadIdsLessThanOrEqualConcurrency: boolean; resultLength: number; results: string[] };
  input: { batch: WorkloadBatchInputInterface; workerPool: WorkerPoolInputInterface };
  shape: 'reuses-workers';
  name: string;
};

function resolveWorkerPath(relativePath: string): string {
  return new URL(relativePath, import.meta.url).pathname;
}

function resolvePoolConfig(config: WorkerPoolInputInterface): WorkerPoolConfigInterface {
  const resolved: WorkerPoolConfigInterface = {
    workerPath: resolveWorkerPath(config.workerPath)
  };
  if (config.batch?.concurrency !== undefined) { resolved.batchConcurrency = config.batch.concurrency; }
  if (config.concurrency !== undefined) { resolved.concurrency = config.concurrency; }
  return resolved;
}

function createWorkloadItems(batch: WorkloadBatchInputInterface): ItemType[] {
  return Array.from({ length: batch.itemCount }, (_unused, index) => ({
    ms: batch.itemMs,
    value: `${batch.valuePrefix}-${String(index)}`
  }));
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'reuses-workers': async (scenarioCase) => {
    const threadIds: number[] = [];

    class ObservingPool extends WorkerPool<ItemType, string> {
      protected override onWorkerCreated(threadId: number): void {
        threadIds.push(threadId);
      }
    }

    const pool = ObservingPool.create(resolvePoolConfig(scenarioCase.input.workerPool));

    const items = createWorkloadItems(scenarioCase.input.batch);

    return pool.run(items).then((results) => {
      assert.equal(results.length, scenarioCase.expected.resultLength);
      assert.deepStrictEqual(results, scenarioCase.expected.results);
      const distinctThreadIds = new Set(threadIds);
      const { concurrency } = scenarioCase.input.workerPool;
      assert.ok(concurrency !== undefined);
      assert.equal(distinctThreadIds.size <= concurrency, scenarioCase.expected.distinctThreadIdsLessThanOrEqualConcurrency);
      assert.equal(distinctThreadIds.size < scenarioCase.input.batch.itemCount, scenarioCase.expected.distinctThreadIdsLessThanItemCount);
    });
  }
};

function runCase(scenarioCase: ScenarioCase): Promise<void> {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('WorkerPool pooling', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
