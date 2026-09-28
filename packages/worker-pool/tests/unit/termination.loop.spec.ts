import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { Worker } from 'node:worker_threads';

import { WorkerPool } from '../../src/WorkerPool.js';
import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';
import { TerminationScenarioCaseEntity } from './entities/TerminationScenarioCaseEntity.js';
import scenarioGroups from './termination.scenarios.json' with { type: 'json' };

type ScenarioCase = TerminationScenarioCaseEntity.Type;
type WorkerPoolInputInterface = ScenarioCase['input']['workerPool'];
type ItemInterface = NonNullable<ScenarioCase['input']['item']>;

const fileIntake = ScenarioFileCompiler.compileIntake(TerminationScenarioCaseEntity.Schema, TerminationScenarioCaseEntity.Node);

function requireItem(item: ScenarioCase['input']['item'] | ScenarioCase['input']['crashItem']): ItemInterface {
  if (item === undefined) {
    throw RuntimeError.create('scenario input item is required');
  }
  return item;
}

function requireString(value: string | undefined): string {
  if (value === undefined) {
    throw RuntimeError.create('scenario field is required');
  }
  return value;
}

async function flushTurn(): Promise<void> {
  await new Promise((resolve) => { setImmediate(resolve); });
}

async function captureUnhandledRejections(scenarioName: string, action: () => Promise<void> | void): Promise<unknown[]> {
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: Error): void => {
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
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

function resolvePoolConfig(config: WorkerPoolInputInterface): WorkerPoolConfigInterface {
  const resolved: WorkerPoolConfigInterface = {
    workerPath: resolveWorkerPath(config.workerPath)
  };
  if (config.concurrency !== undefined) { resolved.concurrency = config.concurrency; }
  if (config.timeoutMs !== undefined) { resolved.timeoutMs = config.timeoutMs; }
  return resolved;
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'final-shutdown-rejection': async (scenarioCase) => {
    const originalTerminate = Worker.prototype.terminate;
    const terminationFailure = RuntimeError.create(requireString(scenarioCase.input.terminateFailureMessage));
    const observedErrors: Array<{ error: Error; index: number }> = [];
    let terminateCalls = 0;

    class ObservingPool extends WorkerPool<ItemInterface, string> {
      protected override async onWorkerError(error: Error, index: number): Promise<void> {
        observedErrors.push({ error, index });
        throw RuntimeError.create('termination observer rejected');
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
        const results = await pool.run([requireItem(scenarioCase.input.item)]);
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
    const terminationFailure = RuntimeError.create(requireString(scenarioCase.input.terminateFailureMessage));
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
        await assert.rejects(pool.run([requireItem(scenarioCase.input.timeoutItem)]), (error: Error) => {
          assert.ok(error instanceof Error);
          assert.ok(error.message.includes(requireString(scenarioCase.expected.runRejectedMessageIncludes)));
          return true;
        });
        const laterResults = await pool.run([requireItem(scenarioCase.input.laterItem)]);
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
    const terminationFailure = RuntimeError.create(requireString(scenarioCase.input.terminateFailureMessage));
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
        await assert.rejects(pool.run([requireItem(scenarioCase.input.crashItem)]), (error: Error) => {
          assert.ok(error instanceof Error);
          assert.ok(error.message.includes(requireString(scenarioCase.expected.runRejectedMessageIncludes)));
          return true;
        });
        const laterResults = await pool.run([requireItem(scenarioCase.input.laterItem)]);
        assert.deepStrictEqual(laterResults, scenarioCase.expected.laterResults);
      });

      assert.equal(terminateCalls, scenarioCase.expected.terminateCalls);
      assert.deepStrictEqual(observedErrors.map(({ error, index }) => ({ index, message: error.message })), scenarioCase.expected.observedErrors);
      // Reference identity, not merely message equality: `onWorkerError` receives the SAME Error
      // instance the terminate mock rejected with. Comparing `.message` alone also passes when a
      // different Error carrying identical text is substituted, which would hide the pool
      // re-wrapping or reconstructing the failure rather than propagating it.
      assert.ok(
        observedErrors.some(({ error, index }) => error === terminationFailure && index === 0),
        'onWorkerError receives the original termination Error instance at index 0'
      );
      assert.deepStrictEqual(rejectionEvents, scenarioCase.expected.rejectionEvents);
    } finally {
      terminateMock.mock.restore();
    }
  },

  'task-timeout-after-startup': async (scenarioCase) => {
    const pool = WorkerPool.create<ItemInterface, string>(resolvePoolConfig(scenarioCase.input.workerPool));

    const rejectionEvents = await captureUnhandledRejections(scenarioCase.shape, async () => {
      await assert.rejects(pool.run([requireItem(scenarioCase.input.item)]), (error: Error) => {
        assert.ok(error.message.includes(requireString(scenarioCase.expected.runRejectedMessageIncludes)));
        return true;
      });
    });

    assert.deepStrictEqual(rejectionEvents, scenarioCase.expected.rejectionEvents);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('WorkerPool termination rejection disposition', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
