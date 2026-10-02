import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { CallerFault } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';

import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';

import { WorkerPool, WorkerPoolError } from '../../src/node/index.js';
import { WorkerFixturePath } from '../helpers/WorkerFixturePath.js';
import { RunScenarioCaseEntity } from './entities/RunScenarioCaseEntity.js';
import scenarioGroups from './run.scenarios.json' with { 'type': 'json' };

interface ItemInterface {
  'awaitResultCount'?: number;
  'barrier'?: SharedArrayBuffer;
  'barrierTarget'?: number;
  'error'?: string;
  'ms'?: number;
  'value': string;
}

class RunSupport {
  static requireItems(items: RunScenarioCaseEntity.Type['input']['items']): NonNullable<RunScenarioCaseEntity.Type['input']['items']> {
    if (items === undefined) {
      throw RuntimeError.create('scenario input.items is required');
    }
    return items;
  }

  static requireBatch(batch: RunScenarioCaseEntity.Type['input']['batch']): NonNullable<RunScenarioCaseEntity.Type['input']['batch']> {
    if (batch === undefined) {
      throw RuntimeError.create('scenario input.batch is required');
    }
    return batch;
  }

  static requireStringArray(values: string[] | undefined): string[] {
    if (values === undefined) {
      throw RuntimeError.create('scenario expected field is required');
    }
    return values;
  }

  static requireString(value: string | undefined): string {
    if (value === undefined) {
      throw RuntimeError.create('scenario expected field is required');
    }
    return value;
  }

  static resolveWorkerPath(relativePath: string): string {
    const absolutePath = WorkerFixturePath.resolveFromModule(
      relativePath,
      import.meta.url
    );
    return absolutePath;
  }

  static resolvePoolConfig(
    config: RunScenarioCaseEntity.Type['input']['workerPool']
  ): WorkerPoolConfigInterface {
    const resolved: WorkerPoolConfigInterface = {
      'workerPath': RunSupport.resolveWorkerPath(config.workerPath)
    };
    if (config.concurrency !== undefined) { resolved.concurrency = config.concurrency; }
    if (config.batch?.concurrency !== undefined) { resolved.batchConcurrency = config.batch.concurrency; }
    if (config.timeoutMs !== undefined) { resolved.timeoutMs = config.timeoutMs; }
    return resolved;
  }

  static createBoundedConcurrencyItems(batch: NonNullable<RunScenarioCaseEntity.Type['input']['batch']>, counts: SharedArrayBuffer): { 'counts': SharedArrayBuffer; 'ms': number; 'value': string }[] {
    const items: { 'counts': SharedArrayBuffer; 'ms': number; 'value': string }[] = [];
    for (let i = 0; i < batch.itemCount; i += 1) {
      items.push({
        'counts': counts,
        'ms': batch.itemMs,
        'value': `${batch.valuePrefix}-${String(i)}`
      });
    }
    return items;
  }
}

class RunRunners {
  static 'bounded-concurrency'(scenarioCase: ScenarioCaseOfType<RunScenarioCaseEntity.Type, 'bounded-concurrency'>): Promise<void> {
    const pool = WorkerPool.create<{ 'counts': SharedArrayBuffer; 'ms': number; 'value': string }, string>(RunSupport.resolvePoolConfig(scenarioCase.input.workerPool));
    const result = (async (): Promise<void> => {
      const sab = new SharedArrayBuffer(2 * Int32Array.BYTES_PER_ELEMENT);
      const counts = new Int32Array(sab);
      counts[0] = 0;
      counts[1] = 0;

      const items = RunSupport.createBoundedConcurrencyItems(RunSupport.requireBatch(scenarioCase.input.batch), sab);
      const results = await pool.run(items);
      assert.equal(results.length, scenarioCase.expected.itemCount);
      const observedMaximum = counts[1];
      const poolConcurrency = scenarioCase.input.workerPool.concurrency;
      assert.ok(poolConcurrency !== undefined);
      assert.equal(observedMaximum <= poolConcurrency, scenarioCase.expected.observedMaximumLessThanOrEqualConcurrency);
      assert.equal(observedMaximum > 1, scenarioCase.expected.observedMaximumGreaterThanOne);
    })();
    return result;
  }

  static async 'error-fail-fast'(scenarioCase: ScenarioCaseOfType<RunScenarioCaseEntity.Type, 'error-fail-fast'>): Promise<void> {
    const observedResults: string[] = [];
    const barrier = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    const barrierCounts = new Int32Array(barrier);

    class ObservingPool extends WorkerPool<ItemInterface, string> {
      protected override onMessage(envelope: { 'type': string; 'value'?: string }): void {
        if (envelope.type === 'result' && envelope.value !== undefined) {
          observedResults.push(envelope.value);
          Atomics.add(barrierCounts, 0, 1);
          Atomics.notify(barrierCounts, 0);
        }
      }
    }

    const pool = ObservingPool.create<ItemInterface, string, ObservingPool>(RunSupport.resolvePoolConfig(scenarioCase.input.workerPool));
    const items = RunSupport.requireItems(scenarioCase.input.items).map((item) => {
      if (item.awaitResultCount === undefined) { return item; }
      return { ...item, 'barrier': barrier, 'barrierTarget': item.awaitResultCount };
    });

    await assert.rejects(pool.run(items), (error: Error): boolean => {
      const rejectedWithBoom = error.message.includes('boom');
      return rejectedWithBoom;
    });
    const expectedResults = RunSupport.requireStringArray(scenarioCase.expected.observedResults);
    assert.deepStrictEqual([...observedResults].toSorted(), [...expectedResults].toSorted());
  }

  static 'exit-retry'(scenarioCase: ScenarioCaseOfType<RunScenarioCaseEntity.Type, 'exit-retry'>): Promise<void> {
    const createdThreads: number[] = [];
    let stateDir: string;
    try {
      stateDir = mkdtempSync(join(os.tmpdir(), 'worker-pool-exit-'));
    } catch (cause) {
      throw WorkerPoolError.from(cause, 'workerPool.createTemporaryDirectoryFailed', 'worker-pool test temporary directory cannot be created');
    }
    const stateFile = join(stateDir, 'retry-flag');

    const result = (async (): Promise<void> => {
      class ObservingPool extends WorkerPool<{ 'exit'?: boolean; 'value': string }, string> {
        protected override onWorkerCreated(threadId: number): void {
          createdThreads.push(threadId);
        }
      }

      const pool = ObservingPool.create<{ 'exit'?: boolean; 'value': string }, string, ObservingPool>(RunSupport.resolvePoolConfig(scenarioCase.input.workerPool));
      let operationFailure: unknown;
      let operationFailed = false;
      try {
        const results = await pool.run(RunSupport.requireItems(scenarioCase.input.items).map((item) => {
          if (item.exit === true) {
            return { ...item, 'stateFile': stateFile };
          }
          return item;
        }));
        assert.deepStrictEqual(results, scenarioCase.expected.results);
        assert.equal(createdThreads.length, scenarioCase.expected.createdWorkerCount);
      } catch (cause) {
        operationFailure = cause;
        operationFailed = true;
      }

      let cleanupFailure: WorkerPoolError | undefined;
      try {
        await rm(stateDir, { 'force': true, 'recursive': true });
      } catch (cause) {
        cleanupFailure = WorkerPoolError.from(cause, 'workerPool.removeTemporaryDirectoryFailed', 'worker-pool test temporary directory cannot be removed');
      }
      if (operationFailed) {
        CallerFault.propagate(operationFailure);
      }
      if (cleanupFailure !== undefined) {
        throw cleanupFailure;
      }
    })();
    return result;
  }

  static 'exit-retry-fails'(scenarioCase: ScenarioCaseOfType<RunScenarioCaseEntity.Type, 'exit-retry-fails'>): Promise<void> {
    const createdThreads: number[] = [];
    const result = (async (): Promise<void> => {
      class ObservingPool extends WorkerPool<{ 'value': string }, string> {
        protected override onWorkerCreated(threadId: number): void {
          createdThreads.push(threadId);
        }
      }

      const pool = ObservingPool.create<{ 'value': string }, string, ObservingPool>(RunSupport.resolvePoolConfig(scenarioCase.input.workerPool));
      await assert.rejects(pool.run(RunSupport.requireItems(scenarioCase.input.items)), (error: Error): boolean => {
        const expectedMessage = RunSupport.requireString(scenarioCase.expected.runRejectedMessageIncludes);
        const rejectedWithExpectedMessage = error.message.includes(expectedMessage);
        return rejectedWithExpectedMessage;
      });
      assert.ok(createdThreads.length >= 2);
    })();
    return result;
  }

  static 'result-order'(scenarioCase: ScenarioCaseOfType<RunScenarioCaseEntity.Type, 'result-order'>): Promise<void> {
    const pool = WorkerPool.create<ItemInterface, string>(RunSupport.resolvePoolConfig(scenarioCase.input.workerPool));
    const result = (async (): Promise<void> => {
      const results = await pool.run(RunSupport.requireItems(scenarioCase.input.items));
      assert.deepStrictEqual(results, scenarioCase.expected.results);
    })();
    return result;
  }

  static 'timeout-rejects'(scenarioCase: ScenarioCaseOfType<RunScenarioCaseEntity.Type, 'timeout-rejects'>): Promise<void> {
    const pool = WorkerPool.create<{ 'ms'?: number; 'value': string }, string>(RunSupport.resolvePoolConfig(scenarioCase.input.workerPool));
    const result = (async (): Promise<void> => {
      await assert.rejects(pool.run(RunSupport.requireItems(scenarioCase.input.items)), (error: Error): boolean => {
        const expectedMessage = RunSupport.requireString(scenarioCase.expected.runRejectedMessageIncludes);
        const rejectedWithExpectedMessage = error.message.includes(expectedMessage);
        return rejectedWithExpectedMessage;
      });
    })();
    return result;
  }
}

ScenarioSuite.register({
  'entity': RunScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'WorkerPool#run',
  'runners': RunRunners
});
