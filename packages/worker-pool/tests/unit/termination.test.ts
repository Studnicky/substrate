import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';

import { WorkerPool } from '../../src/WorkerPool.js';

const WORKER_PATH = new URL('../fixtures/terminationWorker.mjs', import.meta.url).pathname;

interface ItemInterface {
  readonly crash?: boolean;
  readonly error?: string;
  readonly ms?: number;
  readonly value: string;
}

describe('WorkerPool termination rejection disposition', () => {
  it('reports final shutdown termination rejection, records rejecting error hooks, and preserves results', async () => {
    const originalTerminate = Worker.prototype.terminate;
    const terminationFailure = new Error('final termination rejected');
    const observedErrors: Array<{ 'error': Error; 'index': number }> = [];
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };

    class ObservingPool extends WorkerPool<ItemInterface, string> {
      protected override async onWorkerError(error: Error, index: number): Promise<void> {
        observedErrors.push({ 'error': error, 'index': index });
        throw new Error('termination observer rejected');
      }
    }

    process.on('unhandledRejection', onUnhandledRejection);
    const terminateMock = mock.method(
      Worker.prototype,
      'terminate',
      async function terminateWithRejection(this: Worker): Promise<number> {
        await originalTerminate.call(this);
        throw terminationFailure;
      }
    );

    try {
      const pool = ObservingPool.create({ 'concurrency': 1, 'workerPath': WORKER_PATH });
      const results = await pool.run([{ 'value': 'complete' }]);

      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });

      assert.deepEqual(results, ['complete']);
      assert.deepEqual(observedErrors, [{ 'error': terminationFailure, 'index': 0 }]);
      assert.equal(pool.getHookErrorCount(), 1);
      assert.equal(pool.getHookErrors()[0]?.hookName, 'onWorkerError');
      assert.deepEqual(rejectionEvents, []);
    } finally {
      terminateMock.mock.restore();
      process.off('unhandledRejection', onUnhandledRejection);
    }
  });

  it('reports timeout-path termination rejection and still cleans up for a later run', async () => {
    const originalTerminate = Worker.prototype.terminate;
    const terminationFailure = new Error('timeout termination rejected');
    const observedErrors: Array<{ 'error': Error; 'index': number }> = [];
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    let terminateCalls = 0;

    class ObservingPool extends WorkerPool<ItemInterface, string> {
      protected override onWorkerError(error: Error, index: number): void {
        observedErrors.push({ 'error': error, 'index': index });
      }
    }

    process.on('unhandledRejection', onUnhandledRejection);
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
        'concurrency': 1,
        'timeoutMs': 200,
        'workerPath': WORKER_PATH
      });

      await assert.rejects(
        pool.run([{ 'ms': 5000, 'value': 'timeout' }]),
        /exceeded its timeout/
      );
      const laterResults = await pool.run([{ 'value': 'later' }]);

      await new Promise((resolve) => { setImmediate(resolve); });

      assert.deepEqual(laterResults, ['later']);
      assert.equal(terminateCalls >= 3, true);
      assert.deepEqual(observedErrors, [{ 'error': terminationFailure, 'index': 0 }]);
      assert.deepEqual(rejectionEvents, []);
    } finally {
      terminateMock.mock.restore();
      process.off('unhandledRejection', onUnhandledRejection);
    }
  });

  it('reports worker-error-path termination rejection and a later run still progresses', async () => {
    const originalTerminate = Worker.prototype.terminate;
    const terminationFailure = new Error('error termination rejected');
    const observedErrors: Array<{ 'error': Error; 'index': number }> = [];
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    let terminateCalls = 0;

    class ObservingPool extends WorkerPool<ItemInterface, string> {
      protected override onWorkerError(error: Error, index: number): void {
        observedErrors.push({ 'error': error, 'index': index });
      }
    }

    process.on('unhandledRejection', onUnhandledRejection);
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
      const pool = ObservingPool.create({ 'concurrency': 1, 'workerPath': WORKER_PATH });

      await assert.rejects(
        pool.run([{ 'crash': true, 'error': 'worker exploded', 'value': 'crash' }]),
        /worker exploded/
      );
      const laterResults = await pool.run([{ 'value': 'later' }]);

      await new Promise((resolve) => { setImmediate(resolve); });

      assert.deepEqual(laterResults, ['later']);
      assert.equal(
        observedErrors.some(({ error, index }) => error === terminationFailure && index === 0),
        true
      );
      assert.equal(
        observedErrors.some(({ error, index }) => error.message.includes('worker exploded') && index === 0),
        true
      );
      assert.deepEqual(rejectionEvents, []);
    } finally {
      terminateMock.mock.restore();
      process.off('unhandledRejection', onUnhandledRejection);
    }
  });
});
