import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BaseError } from '@studnicky/errors';
import { Signal } from '@studnicky/signal';

import { WorkerPool, WorkerPoolError } from '../../src/node/index.js';
import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';
import scenarioGroups from './creation.scenarios.json' with { type: 'json' };

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
      shape: 'missing-worker-path';
    })
  | (ScenarioCaseBaseInterface & {
      expected: { results: string[] };
      input: { items: ItemInterface[]; workerPool: WorkerPoolInputInterface };
      shape: 'default-concurrency';
    })
  | (ScenarioCaseBaseInterface & {
      expected: { composeCalls: number; results: string[] };
      input: { items: ItemInterface[]; signal: { shape: 'tracking' }; workerPool: WorkerPoolInputInterface };
      shape: 'caller-supplied-signal';
    })
  | (ScenarioCaseBaseInterface & {
      expected: { results: string[] };
      input: { items: ItemInterface[]; workerPool: WorkerPoolInputInterface };
      shape: 'explicit-bounded-concurrency';
    })
  | (ScenarioCaseBaseInterface & {
      expected: { errorMessageIncludes: string };
      input: { workerPool: WorkerPoolInputInterface };
      shape: 'foreign-construction';
    });

function resolveWorkerPath(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
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
    throw new WorkerPoolError({
      'code': 'workerPool.invalidForeignConstructionScenario',
      'message': 'foreign-construction scenario input.workerPool requires batch.concurrency and concurrency'
    });
  }
  return {
    ...resolvePoolConfig(config),
    batchConcurrency: config.batch.concurrency,
    concurrency: config.concurrency
  };
}

type ScenarioRunner<K extends ScenarioCase['shape']> =
  (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void>;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
  'missing-worker-path': async (scenarioCase) => {
    assert.throws(() => WorkerPool.create(resolvePoolConfig(scenarioCase.input.workerPool)), (error: Error) => {
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

      public constructor() {
        super();
      }

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
          'abortSignal': undefined,
          'signal': Signal.create(),
        });
        return Object.create(null);
      }
    }

    assert.throws(() => {
      ForeignWorkerPool.create(resolvePoolConfig(scenarioCase.input.workerPool));
    }, (error: unknown): boolean => {
      assert.ok(error instanceof BaseError);
      assert.ok(error instanceof Error && error.message.includes('must construct a WorkerPool instance'));
      return true;
    });
  }
};

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('WorkerPool.create', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }

  void it('rejects invalid runtime concurrency before dispatch', () => {
    assert.throws(() => WorkerPool.create<ItemInterface, string>({
      'concurrency': 0,
      'workerPath': resolveWorkerPath('../fixtures/echoWorker.mjs')
    }), /WorkerPool configuration is invalid/u);
  });
});
