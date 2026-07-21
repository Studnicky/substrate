import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { WorkerErrorEnvelopeInterface } from '../../src/interfaces/WorkerErrorEnvelopeInterface.js';
import type { WorkerLogEnvelopeInterface } from '../../src/interfaces/WorkerLogEnvelopeInterface.js';
import type { WorkerProgressEnvelopeInterface } from '../../src/interfaces/WorkerProgressEnvelopeInterface.js';
import type { WorkerResultEnvelopeInterface } from '../../src/interfaces/WorkerResultEnvelopeInterface.js';

import { WorkerPool } from '../../src/WorkerPool.js';

const WORKER_PATH = new URL('../fixtures/echoWorker.mjs', import.meta.url).pathname;

type ItemType = { 'value': string; 'error'?: string };

describe('WorkerPool hooks', () => {
  it('onMessage fires for every envelope type: log, progress, and result', async () => {
    const seenTypes: string[] = [];

    class ObservingPool extends WorkerPool<ItemType, string> {
      protected override onMessage(envelope:
        | WorkerErrorEnvelopeInterface
        | WorkerLogEnvelopeInterface
        | WorkerProgressEnvelopeInterface
        | WorkerResultEnvelopeInterface<string>): void {
        seenTypes.push(envelope.type);
      }
    }

    const pool = ObservingPool.create({ 'concurrency': 1, 'workerPath': WORKER_PATH });
    await pool.run([{ 'value': 'x' }]);

    assert.deepEqual(seenTypes, ['log', 'progress', 'result']);
  });

  it('onMessage and onWorkerError both fire when a worker posts an error envelope', async () => {
    const seenTypes: string[] = [];
    const seenErrors: string[] = [];

    class ObservingPool extends WorkerPool<ItemType, string> {
      protected override onMessage(envelope:
        | WorkerErrorEnvelopeInterface
        | WorkerLogEnvelopeInterface
        | WorkerProgressEnvelopeInterface
        | WorkerResultEnvelopeInterface<string>): void {
        seenTypes.push(envelope.type);
      }

      protected override onWorkerError(error: Error): void {
        seenErrors.push(error.message);
      }
    }

    const pool = ObservingPool.create({ 'concurrency': 1, 'workerPath': WORKER_PATH });
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

    const pool = AsyncRejectingMessagePool.create({ 'concurrency': 1, 'workerPath': WORKER_PATH });
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      // run() itself does not await the promise onMessage's hook invocation
      // returns — the regression under test is that HookInvoker still guards
      // the eventual rejection internally, recording it before WorkerPool's
      // swallowing disposition is applied instead
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

  it('records hook failures only on the worker-pool instance that owns the invoker', async () => {
    class FirstThrowingPool extends WorkerPool<ItemType, string> {
      static readonly hookCause = new Error('first pool hook failed');

      protected override onWorkerCreated(): void {
        throw FirstThrowingPool.hookCause;
      }
    }

    class SecondThrowingPool extends WorkerPool<ItemType, string> {
      static readonly hookCause = new Error('second pool hook failed');

      protected override onWorkerCreated(): void {
        throw SecondThrowingPool.hookCause;
      }
    }

    const first = FirstThrowingPool.create({ 'concurrency': 1, 'workerPath': WORKER_PATH });
    const second = SecondThrowingPool.create({ 'concurrency': 1, 'workerPath': WORKER_PATH });

    const [firstResults, secondResults] = await Promise.all([
      first.run([{ 'value': 'first' }]),
      second.run([{ 'value': 'second' }])
    ]);

    const firstErrors = first.getHookErrors();
    const secondErrors = second.getHookErrors();
    assert.deepEqual(firstResults, ['first']);
    assert.deepEqual(secondResults, ['second']);
    assert.equal(first.getHookErrorCount(), 1);
    assert.equal(second.getHookErrorCount(), 1);
    assert.equal(firstErrors[0]?.hookName, 'onWorkerCreated');
    assert.equal(secondErrors[0]?.hookName, 'onWorkerCreated');
    assert.notStrictEqual(firstErrors[0]?.cause, FirstThrowingPool.hookCause);
    assert.notStrictEqual(secondErrors[0]?.cause, SecondThrowingPool.hookCause);
    assert.notStrictEqual(firstErrors[0], first.getHookErrors()[0]);
    assert.notStrictEqual(secondErrors[0], second.getHookErrors()[0]);
    assert.equal(firstErrors[0]?.cause instanceof Error && firstErrors[0].cause.message, 'first pool hook failed');
    assert.equal(secondErrors[0]?.cause instanceof Error && secondErrors[0].cause.message, 'second pool hook failed');
  });
});
