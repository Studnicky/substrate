import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { WorkerEnvelopeType } from '../../src/types/WorkerEnvelopeType.js';

import { WorkerPool } from '../../src/WorkerPool.js';

const WORKER_PATH = new URL('../fixtures/echoWorker.mjs', import.meta.url).pathname;

type ItemType = { 'value': string; 'error'?: string };

describe('WorkerPool hooks', () => {
  it('onMessage fires for every envelope type: log, progress, and result', async () => {
    const seenTypes: string[] = [];

    class ObservingPool extends WorkerPool<ItemType, string> {
      protected override onMessage(envelope: WorkerEnvelopeType<ItemType, string>): void {
        seenTypes.push(envelope.type);
      }
    }

    const pool = ObservingPool.create({ 'concurrency': 1, 'workerPath': WORKER_PATH }) as ObservingPool;
    await pool.run([{ 'value': 'x' }]);

    assert.deepEqual(seenTypes, ['log', 'progress', 'result']);
  });

  it('onMessage and onWorkerError both fire when a worker posts an error envelope', async () => {
    const seenTypes: string[] = [];
    const seenErrors: string[] = [];

    class ObservingPool extends WorkerPool<ItemType, string> {
      protected override onMessage(envelope: WorkerEnvelopeType<ItemType, string>): void {
        seenTypes.push(envelope.type);
      }

      protected override onWorkerError(error: Error): void {
        seenErrors.push(error.message);
      }
    }

    const pool = ObservingPool.create({ 'concurrency': 1, 'workerPath': WORKER_PATH }) as ObservingPool;
    await assert.rejects(pool.run([{ 'error': 'kaboom', 'value': 'x' }]), /kaboom/);

    assert.deepEqual(seenTypes, ['log', 'progress', 'error']);
    assert.deepEqual(seenErrors, ['kaboom']);
  });

  it('a throwing onMessage hook does not prevent the worker result from resolving', async () => {
    class ThrowingMessagePool extends WorkerPool<ItemType, string> {
      protected override onMessage(): void {
        throw new Error('hook boom');
      }
    }

    const pool = ThrowingMessagePool.create({ 'concurrency': 1, 'workerPath': WORKER_PATH });
    const results = await pool.run([{ 'value': 'x' }]);

    assert.deepEqual(results, ['x']);
  });

  it('an async-rejecting onMessage override is routed to getHookErrors() without an unhandled rejection, and the task still resolves', async () => {
    class AsyncRejectingMessagePool extends WorkerPool<ItemType, string> {
      protected override async onMessage(): Promise<void> {
        await Promise.resolve();
        throw new Error('async onMessage boom');
      }
    }

    const pool = AsyncRejectingMessagePool.create({ 'concurrency': 1, 'workerPath': WORKER_PATH }) as AsyncRejectingMessagePool;
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      // run() itself does not await the promise onMessage's hook invocation
      // returns — the regression under test is that HookInvoker still guards
      // the eventual rejection internally, routing it to onHookError (here,
      // WorkerPool's own disposition of recording into #hookErrors) instead
      // of ever producing an unhandled rejection.
      const results = await pool.run([{ 'value': 'x' }]);

      assert.deepEqual(results, ['x']);
      assert.ok(pool.getHookErrorCount() > 0);
      assert.ok(pool.getHookErrors().some((error) => error.hookName === 'onMessage'));

      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });

      assert.deepEqual(rejectionEvents, []);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  });
});
