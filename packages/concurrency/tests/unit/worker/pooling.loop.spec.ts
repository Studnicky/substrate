import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { WorkerPoolConfigInterface } from '../../../src/worker/interfaces/WorkerPoolConfigInterface.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { WorkerPool } from '../../../src/worker/node/index.js';
import { WorkerFixturePath } from '../../helpers/worker/WorkerFixturePath.js';
import { PoolingScenarioCaseEntity } from './entities/PoolingScenarioCaseEntity.js';
import scenarioGroups from './pooling.scenarios.json' with { 'type': 'json' };

class PoolingSupport {
  static resolveWorkerPath(relativePath: string): string {
    const absolutePath = WorkerFixturePath.resolveFromModule(relativePath, import.meta.url);
    return absolutePath;
  }

  static resolvePoolConfig(
    config: PoolingScenarioCaseEntity.Type['input']['workerPool']
  ): WorkerPoolConfigInterface {
    const resolved: WorkerPoolConfigInterface = {
      'workerPath': PoolingSupport.resolveWorkerPath(config.workerPath)
    };
    if (config.batch?.concurrency !== undefined) {
      resolved.batchConcurrency = config.batch.concurrency;
    }
    if (config.concurrency !== undefined) {
      resolved.concurrency = config.concurrency;
    }
    return resolved;
  }

  static createWorkloadItems(
    batch: PoolingScenarioCaseEntity.Type['input']['batch']
  ): { 'ms'?: number; 'value': string }[] {
    const items: { 'ms'?: number; 'value': string }[] = [];
    for (let i = 0; i < batch.itemCount; i += 1) {
      items.push({
        'ms': batch.itemMs,
        'value': `${batch.valuePrefix}-${String(i)}`
      });
    }
    return items;
  }
}

class PoolingRunners {
  static 'reuses-workers'(
    scenarioCase: ScenarioCaseOfType<PoolingScenarioCaseEntity.Type, 'reuses-workers'>
  ): Promise<void> {
    const threadIds: number[] = [];

    class ObservingPool extends WorkerPool<{ 'ms'?: number; 'value': string }, string> {
      protected override onWorkerCreated(threadId: number): void {
        threadIds.push(threadId);
      }
    }

    const pool = ObservingPool.create<{ 'ms'?: number; 'value': string }, string, ObservingPool>(
      PoolingSupport.resolvePoolConfig(scenarioCase.input.workerPool)
    );

    const items = PoolingSupport.createWorkloadItems(scenarioCase.input.batch);

    const result = (async (): Promise<void> => {
      const results = await pool.run(items);
      assert.equal(results.length, scenarioCase.expected.resultLength);
      assert.deepStrictEqual(results, scenarioCase.expected.results);
      const distinctThreadIds = new Set(threadIds);
      const poolConcurrency = scenarioCase.input.workerPool.concurrency;
      assert.ok(poolConcurrency !== undefined);
      assert.equal(
        distinctThreadIds.size <= poolConcurrency,
        scenarioCase.expected.distinctThreadIdsLessThanOrEqualConcurrency
      );
      assert.equal(
        distinctThreadIds.size < scenarioCase.input.batch.itemCount,
        scenarioCase.expected.distinctThreadIdsLessThanItemCount
      );
    })();
    return result;
  }
}

ScenarioSuite.register({
  'entity': PoolingScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'WorkerPool pooling',
  'runners': PoolingRunners
});
