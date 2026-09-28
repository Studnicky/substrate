import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BaseError } from '@studnicky/errors/node';
import { Signal } from '@studnicky/signal/node';

import { WorkerPool, WorkerPoolError } from '../../src/node/index.js';
import { WorkerPoolConfigEntity } from '../../src/entities/WorkerPoolConfigEntity.js';
import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';
import { CreationScenarioCaseEntity } from './entities/CreationScenarioCaseEntity.js';
import scenarioGroups from './creation.scenarios.json' with { type: 'json' };

type ScenarioCase = CreationScenarioCaseEntity.Type;
type WorkerPoolInputInterface = ScenarioCase['input']['workerPool'];

interface ItemInterface {
  value: string;
}

const fileIntake = ScenarioFileCompiler.compileIntake(CreationScenarioCaseEntity.Schema, CreationScenarioCaseEntity.Node);

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

function requireItems(items: ScenarioCase['input']['items']): NonNullable<ScenarioCase['input']['items']> {
  if (items === undefined) {
    throw new WorkerPoolError({ 'code': 'workerPool.invalidScenario', 'message': 'scenario input.items is required' });
  }
  return items;
}

function requireExpectedString(value: string | undefined): string {
  if (value === undefined) {
    throw new WorkerPoolError({ 'code': 'workerPool.invalidScenario', 'message': 'scenario expected field is required' });
  }
  return value;
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'missing-worker-path': async (scenarioCase) => {
    assert.throws(() => WorkerPool.create(resolvePoolConfig(scenarioCase.input.workerPool)), (error: Error) => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes(requireExpectedString(scenarioCase.expected.errorMessageIncludes)));
      return true;
    });
  },

  'default-concurrency': async (scenarioCase) => {
    const pool = WorkerPool.create<ItemInterface, string>(resolvePoolConfig(scenarioCase.input.workerPool));
    const results = await pool.run(requireItems(scenarioCase.input.items));
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

    const results = await pool.run(requireItems(scenarioCase.input.items));
    assert.deepStrictEqual(results, scenarioCase.expected.results);
    assert.equal(signal.calls, scenarioCase.expected.composeCalls);
  },

  'explicit-bounded-concurrency': async (scenarioCase) => {
    const pool = WorkerPool.create<ItemInterface, string>(resolvePoolConfig(scenarioCase.input.workerPool));

    const results = await pool.run(requireItems(scenarioCase.input.items));
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  },

  'foreign-construction': async (scenarioCase) => {
    class ForeignWorkerPool extends WorkerPool<ItemInterface, string> {
      constructor() {
        const parsedConfig = WorkerPoolConfigEntity.intake(resolveRequiredPoolConfig(scenarioCase.input.workerPool));
        if (parsedConfig.batchConcurrency === undefined || parsedConfig.concurrency === undefined) {
          throw new WorkerPoolError({
            'code': 'workerPool.invalidForeignConstructionScenario',
            'message': 'foreign-construction scenario input.workerPool requires batch.concurrency and concurrency'
          });
        }
        super({
          'abortSignal': undefined,
          'batchConcurrency': parsedConfig.batchConcurrency,
          'concurrency': parsedConfig.concurrency,
          'signal': Signal.create(),
          ...(parsedConfig.startupTimeoutMs === undefined ? {} : { 'startupTimeoutMs': parsedConfig.startupTimeoutMs }),
          ...(parsedConfig.timeoutMs === undefined ? {} : { 'timeoutMs': parsedConfig.timeoutMs }),
          'workerPath': parsedConfig.workerPath
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

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('WorkerPool.create', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }

  void it('rejects invalid runtime concurrency before dispatch', () => {
    assert.throws(() => WorkerPool.create<ItemInterface, string>({
      'concurrency': 0,
      'workerPath': resolveWorkerPath('../fixtures/echoWorker.ts')
    }), /WorkerPool configuration is invalid/u);
  });
});

void describe('WorkerPoolError canonical options', () => {
  void it('forwards the shared error arguments while remaining non-retryable', () => {
    const error = new WorkerPoolError({
      'code': 'workerPool.context',
      'correlationId': 'worker-correlation',
      'instance': 'urn:worker-pool:context',
      'message': 'worker context',
      'metadata': { 'workerId': 1 },
      'status': 503
    });

    assert.equal(error.correlationId, 'worker-correlation');
    assert.equal(error.instance, 'urn:worker-pool:context');
    assert.deepEqual(error.metadata, { 'workerId': 1 });
    assert.equal(error.retryable, false);
    assert.equal(error.status, 503);
  });
});
