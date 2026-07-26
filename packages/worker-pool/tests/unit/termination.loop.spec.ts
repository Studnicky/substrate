import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { Worker } from 'node:worker_threads';

import { WorkerPool } from '../../src/WorkerPool.js';
import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';
import scenarioGroups from './termination.scenarios.json' with { type: 'json' };

interface ItemInterface {
  crash?: boolean;
  error?: string;
  ms?: number;
  value: string;
}

interface TerminationFailureExpectationInterface {
  observedErrors: Array<{ index: number; message: string }>;
  rejectionEvents: unknown[];
  terminateCalls: number;
}

interface WorkerPoolInputInterface {
  concurrency?: WorkerPoolConfigInterface['concurrency'];
  timeoutMs?: WorkerPoolConfigInterface['timeoutMs'];
  workerPath: WorkerPoolConfigInterface['workerPath'];
}

type ScenarioCase =
  | {
      description: string;
      expected: TerminationFailureExpectationInterface & { results: string[] };
      input: { item: ItemInterface; terminateFailureMessage: string; workerPool: WorkerPoolInputInterface };
      shape: 'final-shutdown-rejection';
      name: string;
    }
  | {
      description: string;
      expected: TerminationFailureExpectationInterface & { laterResults: string[]; runRejectedMessageIncludes: string };
      input: { laterItem: ItemInterface; terminateFailureMessage: string; timeoutItem: ItemInterface; workerPool: WorkerPoolInputInterface };
      shape: 'timeout-shutdown-rejection';
      name: string;
    }
  | {
      description: string;
      expected: TerminationFailureExpectationInterface & { laterResults: string[]; runRejectedMessageIncludes: string };
      input: { crashItem: ItemInterface; laterItem: ItemInterface; terminateFailureMessage: string; workerPool: WorkerPoolInputInterface };
      shape: 'error-shutdown-rejection';
      name: string;
    };

async function flushTurn(): Promise<void> {
  await new Promise((resolve) => { setImmediate(resolve); });
}

async function captureUnhandledRejections(scenarioName: string, action: () => Promise<void> | void): Promise<unknown[]> {
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => {
    rejectionEvents.push(reason);
    console.error('[%s] captured unhandledRejection', scenarioName, reason);
  };

  process.on('unhandledRejection', onUnhandledRejection);
  try {
    await action();
    await flushTurn();
    await flushTurn();
    return rejectionEvents;
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
}

function resolveWorkerPath(relativePath: string): string {
  return new URL(relativePath, import.meta.url).pathname;
}

function resolvePoolConfig(config: WorkerPoolInputInterface): WorkerPoolConfigInterface {
  const resolved: WorkerPoolConfigInterface = {
    workerPath: resolveWorkerPath(config.workerPath)
  };
  if (config.concurrency !== undefined) { resolved.concurrency = config.concurrency; }
  if (config.timeoutMs !== undefined) { resolved.timeoutMs = config.timeoutMs; }
  return resolved;
}

type ScenarioRunner<K extends ScenarioCase['shape']> =
  (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void>;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
  'final-shutdown-rejection': async (scenarioCase) => {
    const originalTerminate = Worker.prototype.terminate;
    const terminationFailure = new Error(scenarioCase.input.terminateFailureMessage);
    const observedErrors: Array<{ error: Error; index: number }> = [];
    let terminateCalls = 0;

    class ObservingPool extends WorkerPool<ItemInterface, string> {
      protected override async onWorkerError(error: Error, index: number): Promise<void> {
        observedErrors.push({ error, index });
        throw new Error('termination observer rejected');
      }
    }

    const terminateMock = mock.method(
      Worker.prototype,
      'terminate',
      async function terminateWithRejection(this: Worker): Promise<number> {
        terminateCalls += 1;
        await originalTerminate.call(this);
        throw terminationFailure;
      }
    );

    try {
      const pool = ObservingPool.create(resolvePoolConfig(scenarioCase.input.workerPool));
      const rejectionEvents = await captureUnhandledRejections(scenarioCase.shape, async () => {
        const results = await pool.run([scenarioCase.input.item]);
        assert.deepStrictEqual(results, scenarioCase.expected.results);
      });

      assert.deepStrictEqual(observedErrors.map(({ error, index }) => ({ index, message: error.message })), scenarioCase.expected.observedErrors);
      assert.equal(terminateCalls, scenarioCase.expected.terminateCalls);
      assert.equal(pool.getHookErrorCount(), 1);
      assert.equal(pool.getHookErrors()[0]?.hookName, 'onWorkerError');
      assert.deepStrictEqual(rejectionEvents, scenarioCase.expected.rejectionEvents);
    } finally {
      terminateMock.mock.restore();
    }
  },

  'timeout-shutdown-rejection': async (scenarioCase) => {
    const originalTerminate = Worker.prototype.terminate;
    const terminationFailure = new Error(scenarioCase.input.terminateFailureMessage);
    const observedErrors: Array<{ error: Error; index: number }> = [];
    let terminateCalls = 0;

    class ObservingPool extends WorkerPool<ItemInterface, string> {
      protected override onWorkerError(error: Error, index: number): void {
        observedErrors.push({ error, index });
      }
    }

    const terminateMock = mock.method(
      Worker.prototype,
      'terminate',
      function rejectFirstTermination(this: Worker): Promise<number> {
        terminateCalls += 1;
        if (terminateCalls === 1) {
          return Promise.reject(terminationFailure);
        }
        return originalTerminate.call(this);
      }
    );

    try {
      const pool = ObservingPool.create({
        ...resolvePoolConfig(scenarioCase.input.workerPool)
      });

      const rejectionEvents = await captureUnhandledRejections(scenarioCase.shape, async () => {
        await assert.rejects(pool.run([scenarioCase.input.timeoutItem]), (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.ok(error.message.includes(scenarioCase.expected.runRejectedMessageIncludes));
          return true;
        });
        const laterResults = await pool.run([scenarioCase.input.laterItem]);
        assert.deepStrictEqual(laterResults, scenarioCase.expected.laterResults);
      });

      assert.equal(terminateCalls, scenarioCase.expected.terminateCalls);
      assert.deepStrictEqual(observedErrors.map(({ error, index }) => ({ index, message: error.message })), scenarioCase.expected.observedErrors);
      assert.deepStrictEqual(rejectionEvents, scenarioCase.expected.rejectionEvents);
    } finally {
      terminateMock.mock.restore();
    }
  },

  'error-shutdown-rejection': async (scenarioCase) => {
    const originalTerminate = Worker.prototype.terminate;
    const terminationFailure = new Error(scenarioCase.input.terminateFailureMessage);
    const observedErrors: Array<{ error: Error; index: number }> = [];
    let terminateCalls = 0;

    class ObservingPool extends WorkerPool<ItemInterface, string> {
      protected override onWorkerError(error: Error, index: number): void {
        observedErrors.push({ error, index });
      }
    }

    const terminateMock = mock.method(
      Worker.prototype,
      'terminate',
      function rejectFirstTermination(this: Worker): Promise<number> {
        terminateCalls += 1;
        if (terminateCalls === 1) {
          return Promise.reject(terminationFailure);
        }
        return originalTerminate.call(this);
      }
    );

    try {
      const pool = ObservingPool.create({
        ...resolvePoolConfig(scenarioCase.input.workerPool)
      });
      const rejectionEvents = await captureUnhandledRejections(scenarioCase.shape, async () => {
        await assert.rejects(pool.run([scenarioCase.input.crashItem]), (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.ok(error.message.includes(scenarioCase.expected.runRejectedMessageIncludes));
          return true;
        });
        const laterResults = await pool.run([scenarioCase.input.laterItem]);
        assert.deepStrictEqual(laterResults, scenarioCase.expected.laterResults);
      });

      assert.equal(terminateCalls, scenarioCase.expected.terminateCalls);
      assert.deepStrictEqual(observedErrors.map(({ error, index }) => ({ index, message: error.message })), scenarioCase.expected.observedErrors);
      assert.deepStrictEqual(rejectionEvents, scenarioCase.expected.rejectionEvents);
    } finally {
      terminateMock.mock.restore();
    }
  }
};

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('WorkerPool termination rejection disposition', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
