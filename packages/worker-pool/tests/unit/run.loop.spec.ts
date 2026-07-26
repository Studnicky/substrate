import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import os from 'node:os';
import { describe, it } from 'node:test';
import { join } from 'node:path';

import { WorkerPool } from '../../src/WorkerPool.js';
import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';
import scenarioGroups from './run.scenarios.json' with { type: 'json' };

type ItemType = {
  awaitResultCount?: number;
  barrier?: SharedArrayBuffer;
  barrierTarget?: number;
  error?: string;
  ms?: number;
  value: string;
};

interface WorkerPoolBatchConfigInputInterface {
  concurrency?: WorkerPoolConfigInterface['batchConcurrency'];
}

interface WorkerPoolInputInterface {
  batch?: WorkerPoolBatchConfigInputInterface;
  concurrency: WorkerPoolConfigInterface['concurrency'];
  timeoutMs?: WorkerPoolConfigInterface['timeoutMs'];
  workerPath: WorkerPoolConfigInterface['workerPath'];
}

interface BoundedConcurrencyBatchInputInterface {
  itemCount: number;
  itemMs: number;
  valuePrefix: string;
}

function resolveWorkerPath(relativePath: string): string {
  return new URL(relativePath, import.meta.url).pathname;
}

function resolvePoolConfig(config: WorkerPoolInputInterface): WorkerPoolConfigInterface {
  const resolved: WorkerPoolConfigInterface = {
    workerPath: resolveWorkerPath(config.workerPath)
  };
  if (config.concurrency !== undefined) { resolved.concurrency = config.concurrency; }
  if (config.batch?.concurrency !== undefined) { resolved.batchConcurrency = config.batch.concurrency; }
  if (config.timeoutMs !== undefined) { resolved.timeoutMs = config.timeoutMs; }
  return resolved;
}

function createBoundedConcurrencyItems(batch: BoundedConcurrencyBatchInputInterface, counts: SharedArrayBuffer): Array<{ counts: SharedArrayBuffer; ms: number; value: string }> {
  return Array.from({ length: batch.itemCount }, (_unused, index) => ({
    counts,
    ms: batch.itemMs,
    value: `${batch.valuePrefix}-${String(index)}`
  }));
}

type ScenarioCase =
  | {
      description: string;
      expected: { results: string[] };
      input: { items: ItemType[]; workerPool: WorkerPoolInputInterface };
      shape: 'result-order';
      name: string;
    }
  | {
      description: string;
      expected: { itemCount: number; observedMaxGreaterThanOne: true; observedMaxLessThanOrEqualConcurrency: true };
      input: { batch: BoundedConcurrencyBatchInputInterface; workerPool: WorkerPoolInputInterface };
      shape: 'bounded-concurrency';
      name: string;
    }
  | {
      description: string;
      expected: { observedResults: string[] };
      input: { items: ItemType[]; workerPool: WorkerPoolInputInterface };
      shape: 'error-fail-fast';
      name: string;
    }
  | {
      description: string;
      expected: { createdWorkerCount: number; results: string[] };
      input: { items: Array<{ exit?: boolean; value: string }>; workerPool: WorkerPoolInputInterface };
      shape: 'exit-retry';
      name: string;
    }
  | {
      description: string;
      expected: { runRejectedMessageIncludes: string };
      input: { items: Array<{ value: string }>; workerPool: WorkerPoolInputInterface };
      shape: 'exit-retry-fails';
      name: string;
    }
  | {
      description: string;
      expected: { runRejectedMessageIncludes: string };
      input: { items: Array<{ ms?: number; value: string }>; workerPool: WorkerPoolInputInterface };
      shape: 'timeout-rejects';
      name: string;
    };

type ScenarioRunner<K extends ScenarioCase['shape']> =
  (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void>;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
  'result-order': async (scenarioCase) => {
    const pool = WorkerPool.create<ItemType, string>(resolvePoolConfig(scenarioCase.input.workerPool));
    assert.deepStrictEqual(await pool.run(scenarioCase.input.items), scenarioCase.expected.results);
  },
  'bounded-concurrency': async (scenarioCase) => {
    const pool = WorkerPool.create<{ counts: SharedArrayBuffer; ms: number; value: string }, string>(resolvePoolConfig(scenarioCase.input.workerPool));

    const sab = new SharedArrayBuffer(2 * Int32Array.BYTES_PER_ELEMENT);
    const counts = new Int32Array(sab);
    counts[0] = 0;
    counts[1] = 0;

    const items = createBoundedConcurrencyItems(scenarioCase.input.batch, sab);

    const results = await pool.run(items);
    assert.equal(results.length, scenarioCase.expected.itemCount);
    const observedMax = counts[1];
    const { concurrency } = scenarioCase.input.workerPool;
    assert.ok(concurrency !== undefined);
    assert.equal(observedMax <= concurrency, scenarioCase.expected.observedMaxLessThanOrEqualConcurrency);
    assert.equal(observedMax > 1, scenarioCase.expected.observedMaxGreaterThanOne);
  },
  'error-fail-fast': async (scenarioCase) => {
    const observedResults: string[] = [];

    // Shared observed-result counter: workers awaiting a barrier block until the parent has
    // *observed* this many 'result' envelopes, closing the race between message delivery from two
    // independent worker threads (see fixtures/echoWorker.mjs for the worker-side wait).
    const barrier = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    const barrierCounts = new Int32Array(barrier);

    class ObservingPool extends WorkerPool<ItemType, string> {
      protected override onMessage(envelope: { type: string; value?: string }): void {
        if (envelope.type === 'result' && envelope.value !== undefined) {
          observedResults.push(envelope.value);
          Atomics.add(barrierCounts, 0, 1);
          Atomics.notify(barrierCounts, 0);
        }
      }
    }

    const pool = ObservingPool.create<ItemType, string, ObservingPool>(resolvePoolConfig(scenarioCase.input.workerPool));

    const items = scenarioCase.input.items.map((item) => {
      if (item.awaitResultCount === undefined) { return item; }
      return { ...item, barrier, barrierTarget: item.awaitResultCount };
    });

    await assert.rejects(pool.run(items), /boom/);
    assert.deepStrictEqual([...observedResults].sort(), [...scenarioCase.expected.observedResults].sort());
  },
  'exit-retry': async (scenarioCase) => {
    const createdThreads: number[] = [];
    const stateDir = mkdtempSync(join(os.tmpdir(), 'worker-pool-exit-'));
    const stateFile = join(stateDir, 'retry-flag');

    class ObservingPool extends WorkerPool<{ exit?: boolean; value: string }, string> {
      protected override onWorkerCreated(threadId: number): void {
        createdThreads.push(threadId);
      }
    }

    const pool = ObservingPool.create(resolvePoolConfig(scenarioCase.input.workerPool));

    try {
      const results = await pool.run(scenarioCase.input.items.map((item) => {
        if (item.exit === true) {
          return { ...item, stateFile };
        }
        return item;
      }));
      assert.deepStrictEqual(results, scenarioCase.expected.results);
      assert.equal(createdThreads.length, scenarioCase.expected.createdWorkerCount);
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  },
  'exit-retry-fails': async (scenarioCase) => {
    const createdThreads: number[] = [];

    class ObservingPool extends WorkerPool<{ value: string }, string> {
      protected override onWorkerCreated(threadId: number): void {
        createdThreads.push(threadId);
      }
    }

    const pool = ObservingPool.create(resolvePoolConfig(scenarioCase.input.workerPool));

    await assert.rejects(pool.run(scenarioCase.input.items), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes(scenarioCase.expected.runRejectedMessageIncludes));
      return true;
    });
    assert.ok(createdThreads.length >= 2);
  },
  'timeout-rejects': async (scenarioCase) => {
    const pool = WorkerPool.create<{ ms?: number; value: string }, string>(resolvePoolConfig(scenarioCase.input.workerPool));

    await assert.rejects(pool.run(scenarioCase.input.items), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes(scenarioCase.expected.runRejectedMessageIncludes));
      return true;
    });
  }
};

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('WorkerPool#run', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
