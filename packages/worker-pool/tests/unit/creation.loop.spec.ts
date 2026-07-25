import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Signal } from '@studnicky/signal';

import { WorkerPool } from '../../src/WorkerPool.js';
import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';
import scenarioGroups from './creation.scenarios.json';

interface ItemInterface {
  value: string;
}

interface ScenarioCaseBaseInterface {
  description: string;
  name: string;
}

interface BatchConfigInputInterface {
  concurrency?: WorkerPoolConfigInterface['batchConcurrency'];
}

interface WorkerPoolInputInterface {
  batch?: BatchConfigInputInterface;
  concurrency?: WorkerPoolConfigInterface['concurrency'];
  timeoutMs?: WorkerPoolConfigInterface['timeoutMs'];
  workerPath: WorkerPoolConfigInterface['workerPath'];
}

type ScenarioCase =
  | (ScenarioCaseBaseInterface & {
      expected: { errorMessageIncludes: string };
      input: { workerPool: WorkerPoolInputInterface };
      kind: 'missing-worker-path';
    })
  | (ScenarioCaseBaseInterface & {
      expected: { results: string[] };
      input: { items: ItemInterface[]; workerPool: WorkerPoolInputInterface };
      kind: 'default-concurrency';
    })
  | (ScenarioCaseBaseInterface & {
      expected: { composeCalls: number; results: string[] };
      input: { items: ItemInterface[]; signal: { kind: 'tracking' }; workerPool: WorkerPoolInputInterface };
      kind: 'caller-supplied-signal';
    })
  | (ScenarioCaseBaseInterface & {
      expected: { results: string[] };
      input: { items: ItemInterface[]; workerPool: WorkerPoolInputInterface };
      kind: 'explicit-bounded-concurrency';
    })
  | (ScenarioCaseBaseInterface & {
      expected: { errorMessageIncludes: string };
      input: { workerPool: WorkerPoolInputInterface };
      kind: 'foreign-construction';
    });

function resolveWorkerPath(relativePath: string): string {
  return new URL(relativePath, import.meta.url).pathname;
}

function resolvePoolConfig(config: WorkerPoolInputInterface): WorkerPoolConfigInterface {
  const resolved: WorkerPoolConfigInterface = {
    workerPath: config.workerPath.length === 0
      ? config.workerPath
      : resolveWorkerPath(config.workerPath)
  };
  if (config.batch?.concurrency !== undefined) { resolved.batchConcurrency = config.batch.concurrency; }
  if (config.concurrency !== undefined) { resolved.concurrency = config.concurrency; }
  if (config.timeoutMs !== undefined) { resolved.timeoutMs = config.timeoutMs; }
  return resolved;
}

function resolveRequiredPoolConfig(config: WorkerPoolInputInterface): WorkerPoolConfigInterface & { batchConcurrency: number; concurrency: number } {
  if (config.batch?.concurrency === undefined || config.concurrency === undefined) {
    throw new Error('foreign-construction scenario input.workerPool requires batch.concurrency and concurrency');
  }
  return {
    ...resolvePoolConfig(config),
    batchConcurrency: config.batch.concurrency,
    concurrency: config.concurrency
  };
}

const runnerMap: Record<ScenarioCase['kind'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'missing-worker-path': async (scenarioCase) => {
    assert.throws(() => WorkerPool.create(resolvePoolConfig(scenarioCase.input.workerPool)), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes(scenarioCase.expected.errorMessageIncludes));
      return true;
    });
  },

  'default-concurrency': async (scenarioCase) => {
    const pool = WorkerPool.create<ItemInterface, string>(resolvePoolConfig(scenarioCase.input.workerPool));
    const results = await pool.run(scenarioCase.input.items);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  },

  'caller-supplied-signal': async (scenarioCase) => {
    class TrackingSignal extends Signal {
      calls = 0;

      protected override onCompose(): void {
        this.calls += 1;
      }
    }

    const signal = new TrackingSignal();
    const pool = WorkerPool.create<ItemInterface, string>({
      ...resolvePoolConfig(scenarioCase.input.workerPool),
      signal,
    });

    const results = await pool.run(scenarioCase.input.items);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
    assert.equal(signal.calls, scenarioCase.expected.composeCalls);
  },

  'explicit-bounded-concurrency': async (scenarioCase) => {
    const pool = WorkerPool.create<ItemInterface, string>(resolvePoolConfig(scenarioCase.input.workerPool));

    const results = await pool.run(scenarioCase.input.items);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  },

  'foreign-construction': async (scenarioCase) => {
    class ForeignWorkerPool extends WorkerPool<ItemInterface, string> {
      constructor() {
        super({
          ...resolveRequiredPoolConfig(scenarioCase.input.workerPool),
          'signal': Signal.create(),
        });
        return { 'not': 'a worker pool' } as never;
      }
    }

    assert.throws(() => {
      ForeignWorkerPool.create(resolvePoolConfig(scenarioCase.input.workerPool));
    }, (error: unknown) => {
      assert.ok(error instanceof TypeError);
      assert.ok((error as Error).message.includes('must construct a WorkerPool instance'));
      return true;
    });
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('WorkerPool.create', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
