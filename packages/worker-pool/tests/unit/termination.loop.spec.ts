import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';
import type { Worker } from 'node:worker_threads';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';

import { WorkerPool } from '../../src/WorkerPool.js';
import { WorkerFixturePath } from '../helpers/WorkerFixturePath.js';
import { TerminationScenarioCaseEntity } from './entities/TerminationScenarioCaseEntity.js';
import scenarioGroups from './termination.scenarios.json' with { 'type': 'json' };

class TerminationSupport {
  static requireItem(
    item: TerminationScenarioCaseEntity.Type['input']['item' | 'crashItem' | 'laterItem' | 'timeoutItem']
  ): NonNullable<TerminationScenarioCaseEntity.Type['input']['item' | 'crashItem' | 'laterItem' | 'timeoutItem']> {
    if (item === undefined) {
      throw RuntimeError.create('scenario input item is required');
    }
    return item;
  }

  static requireString(value: string | undefined): string {
    if (value === undefined) {
      throw RuntimeError.create('scenario field is required');
    }
    return value;
  }

  static async flushTurn(): Promise<void> {
    await new Promise((resolve): void => { setImmediate(resolve); });
  }

  static async captureUnhandledRejections(action: () => Promise<void> | void): Promise<unknown[]> {
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => {
      rejectionEvents.push(reason);
    };

    process.on('unhandledRejection', onUnhandledRejection);
    try {
      await action();
      await TerminationSupport.flushTurn();
      await TerminationSupport.flushTurn();
      return rejectionEvents;
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static resolveWorkerPath(relativePath: string): string {
    const absolutePath = WorkerFixturePath.resolveFromModule(
      relativePath,
      import.meta.url
    );
    return absolutePath;
  }

  static resolvePoolConfig(
    config: TerminationScenarioCaseEntity.Type['input']['workerPool']
  ): WorkerPoolConfigInterface {
    const resolved: WorkerPoolConfigInterface = {
      'workerPath': TerminationSupport.resolveWorkerPath(config.workerPath)
    };
    if (config.concurrency !== undefined) { resolved.concurrency = config.concurrency; }
    if (config.timeoutMs !== undefined) { resolved.timeoutMs = config.timeoutMs; }
    return resolved;
  }

  static assertRunRejects(error: Error, messageFragment: string): boolean {
    assert.ok(error.message.includes(messageFragment));
    return true;
  }

  static async assertRejectedRun(run: Promise<unknown>, messageFragment: string): Promise<void> {
    await assert.rejects(run, (error: Error): boolean => {
      const result = TerminationSupport.assertRunRejects(error, messageFragment);
      return result;
    });
  }


  static workerErrors(errors: readonly { readonly 'error': Error; readonly 'index': number }[]): { 'index': number; 'message': string }[] {
    const result = errors.map(({ error, index }) => {
      return { 'index': index, 'message': error.message };
    });
    return result;
  }
}

class TerminationRunners {
  static 'error-shutdown-rejection'(scenarioCase: ScenarioCaseOfType<TerminationScenarioCaseEntity.Type, 'error-shutdown-rejection'>): Promise<void> {
    const terminationFailure = RuntimeError.create(TerminationSupport.requireString(scenarioCase.input.terminateFailureMessage));
    const observedErrors: { 'error': Error; 'index': number }[] = [];
    let terminateCalls = 0;

    class ObservingPool extends WorkerPool<NonNullable<TerminationScenarioCaseEntity.Type['input']['item' | 'crashItem' | 'laterItem' | 'timeoutItem']>, string> {
      protected override onWorkerError(error: Error, index: number): void {
        observedErrors.push({ 'error': error, 'index': index });
      }

      protected override terminateWorker(worker: Worker): Promise<number> {
        terminateCalls += 1;
        if (terminateCalls === 1) {
          const result = Promise.reject(terminationFailure);
          return result;
        }
        const result = super.terminateWorker(worker);
        return result;
      }
    }

    const result = (async (): Promise<void> => {
      const pool = ObservingPool.create<NonNullable<TerminationScenarioCaseEntity.Type['input']['item' | 'crashItem' | 'laterItem' | 'timeoutItem']>, string, ObservingPool>(TerminationSupport.resolvePoolConfig(scenarioCase.input.workerPool));
      const rejectionEvents = await TerminationSupport.captureUnhandledRejections(async () => {
        await TerminationSupport.assertRejectedRun(
          pool.run([TerminationSupport.requireItem(scenarioCase.input.crashItem)]),
          TerminationSupport.requireString(scenarioCase.expected.runRejectedMessageIncludes)
        );
        const laterResults = await pool.run([TerminationSupport.requireItem(scenarioCase.input.laterItem)]);
        assert.deepStrictEqual(laterResults, scenarioCase.expected.laterResults);
      });

      assert.equal(terminateCalls, scenarioCase.expected.terminateCalls);
      assert.deepStrictEqual(TerminationSupport.workerErrors(observedErrors), scenarioCase.expected.observedErrors);
      assert.deepStrictEqual(rejectionEvents, scenarioCase.expected.rejectionEvents);
    })();
    return result;
  }

  static 'final-shutdown-rejection'(scenarioCase: ScenarioCaseOfType<TerminationScenarioCaseEntity.Type, 'final-shutdown-rejection'>): Promise<void> {
    const terminationFailure = RuntimeError.create(TerminationSupport.requireString(scenarioCase.input.terminateFailureMessage));
    const observedErrors: { 'error': Error; 'index': number }[] = [];
    let terminateCalls = 0;

    class ObservingPool extends WorkerPool<NonNullable<TerminationScenarioCaseEntity.Type['input']['item' | 'crashItem' | 'laterItem' | 'timeoutItem']>, string> {
      protected override onWorkerError(error: Error, index: number): Promise<void> {
        observedErrors.push({ 'error': error, 'index': index });
        const result = Promise.reject(RuntimeError.create('termination observer rejected'));
        return result;
      }

      protected override terminateWorker(worker: Worker): Promise<number> {
        terminateCalls += 1;
        const result = super.terminateWorker(worker).then(() => {
          throw terminationFailure;
        });
        return result;
      }
    }

    const result = (async (): Promise<void> => {
      const pool = ObservingPool.create<NonNullable<TerminationScenarioCaseEntity.Type['input']['item' | 'crashItem' | 'laterItem' | 'timeoutItem']>, string, ObservingPool>(TerminationSupport.resolvePoolConfig(scenarioCase.input.workerPool));
      const rejectionEvents = await TerminationSupport.captureUnhandledRejections(async () => {
        const results = await pool.run([TerminationSupport.requireItem(scenarioCase.input.item)]);
        assert.deepStrictEqual(results, scenarioCase.expected.results);
      });

      assert.deepStrictEqual(TerminationSupport.workerErrors(observedErrors), scenarioCase.expected.observedErrors);
      assert.equal(terminateCalls, scenarioCase.expected.terminateCalls);
      assert.equal(pool.getHookErrorCount(), 1);
      assert.equal(pool.getHookErrors()[0]?.hookName, 'onWorkerError');
      assert.deepStrictEqual(rejectionEvents, scenarioCase.expected.rejectionEvents);
    })();
    return result;
  }

  static 'task-timeout-after-startup'(scenarioCase: ScenarioCaseOfType<TerminationScenarioCaseEntity.Type, 'task-timeout-after-startup'>): Promise<void> {
    const pool = WorkerPool.create<NonNullable<TerminationScenarioCaseEntity.Type['input']['item' | 'crashItem' | 'laterItem' | 'timeoutItem']>, string>(TerminationSupport.resolvePoolConfig(scenarioCase.input.workerPool));
    const result = (async (): Promise<void> => {
      const rejectionEvents = await TerminationSupport.captureUnhandledRejections(async () => {
        await TerminationSupport.assertRejectedRun(
          pool.run([TerminationSupport.requireItem(scenarioCase.input.item)]),
          TerminationSupport.requireString(scenarioCase.expected.runRejectedMessageIncludes)
        );
      });

      assert.deepStrictEqual(rejectionEvents, scenarioCase.expected.rejectionEvents);
    })();
    return result;
  }

  static 'timeout-shutdown-rejection'(scenarioCase: ScenarioCaseOfType<TerminationScenarioCaseEntity.Type, 'timeout-shutdown-rejection'>): Promise<void> {
    const terminationFailure = RuntimeError.create(TerminationSupport.requireString(scenarioCase.input.terminateFailureMessage));
    const observedErrors: { 'error': Error; 'index': number }[] = [];
    let terminateCalls = 0;

    class ObservingPool extends WorkerPool<NonNullable<TerminationScenarioCaseEntity.Type['input']['item' | 'crashItem' | 'laterItem' | 'timeoutItem']>, string> {
      protected override onWorkerError(error: Error, index: number): void {
        observedErrors.push({ 'error': error, 'index': index });
      }

      protected override terminateWorker(worker: Worker): Promise<number> {
        terminateCalls += 1;
        if (terminateCalls === 1) {
          const result = Promise.reject(terminationFailure);
          return result;
        }
        const result = super.terminateWorker(worker);
        return result;
      }
    }

    const result = (async (): Promise<void> => {
      const poolConfig = TerminationSupport.resolvePoolConfig(scenarioCase.input.workerPool);
      const pool = ObservingPool.create<NonNullable<TerminationScenarioCaseEntity.Type['input']['item' | 'crashItem' | 'laterItem' | 'timeoutItem']>, string, ObservingPool>(poolConfig);
      const rejectionEvents = await TerminationSupport.captureUnhandledRejections(async () => {
        await TerminationSupport.assertRejectedRun(
          pool.run([TerminationSupport.requireItem(scenarioCase.input.timeoutItem)]),
          TerminationSupport.requireString(scenarioCase.expected.runRejectedMessageIncludes)
        );
        const recoveryPool = ObservingPool.create<NonNullable<TerminationScenarioCaseEntity.Type['input']['item' | 'crashItem' | 'laterItem' | 'timeoutItem']>, string, ObservingPool>({ ...poolConfig, 'timeoutMs': 1000 });
        const laterResults = await recoveryPool.run([TerminationSupport.requireItem(scenarioCase.input.laterItem)]);
        assert.deepStrictEqual(laterResults, scenarioCase.expected.laterResults);
      });

      assert.equal(terminateCalls, scenarioCase.expected.terminateCalls);
      assert.deepStrictEqual(TerminationSupport.workerErrors(observedErrors), scenarioCase.expected.observedErrors);
      assert.deepStrictEqual(rejectionEvents, scenarioCase.expected.rejectionEvents);
    })();
    return result;
  }
}

ScenarioSuite.register({
  'entity': TerminationScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'WorkerPool termination rejection disposition',
  'runners': TerminationRunners
});
