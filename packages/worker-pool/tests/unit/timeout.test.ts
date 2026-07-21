import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Signal } from '@studnicky/signal';

import { WorkerPool } from '../../src/WorkerPool.js';

const WORKER_PATH = new URL('../fixtures/echoWorker.mjs', import.meta.url).pathname;

describe('WorkerPool timeout', () => {
  it('terminates a worker that exceeds timeoutMs and rejects that task, firing onWorkerTimeout', async () => {
    const timedOutIndexes: number[] = [];

    class TimeoutObservingPool extends WorkerPool<{ 'value': string; 'ms'?: number }, string> {
      protected override onWorkerTimeout(index: number): void {
        timedOutIndexes.push(index);
      }
    }

    const pool = TimeoutObservingPool.create({
      'concurrency': 1,
      'timeoutMs': 200,
      'workerPath': WORKER_PATH
    });

    // The task's own artificial delay (5s) vastly exceeds timeoutMs (200ms), so the timeout
    // fires reliably even under heavy CI/thread-spin-up contention.
    await assert.rejects(
      pool.run([{ 'ms': 5000, 'value': 'too-slow' }]),
      /exceeded its timeout/
    );

    assert.deepEqual(timedOutIndexes, [0]);
  });

  it('a task within timeoutMs resolves normally', async () => {
    const pool = WorkerPool.create<{ 'value': string; 'ms'?: number }, string>({
      'concurrency': 1,
      'timeoutMs': 20000,
      'workerPath': WORKER_PATH
    });

    // timeoutMs is deliberately generous relative to the task's own 10ms delay, so worker
    // spin-up jitter under heavy CI/thread contention cannot make this falsely time out.
    const results = await pool.run([{ 'ms': 10, 'value': 'fast' }]);
    assert.deepEqual(results, ['fast']);
  });

  it('awaits timeout signal composition before dispatching a task', async () => {
    class DeferredSignal extends Signal {
      readonly entered = Promise.withResolvers<void>();
      readonly release = Promise.withResolvers<void>();

      protected override async onCompose(): Promise<void> {
        this.entered.resolve();
        await this.release.promise;
      }
    }

    class MessageObservingPool extends WorkerPool<{ 'value': string }, string> {
      messages = 0;

      protected override onMessage(): void {
        this.messages += 1;
      }
    }

    const signal = new DeferredSignal();
    const pool = MessageObservingPool.create({
      signal,
      'timeoutMs': 1000,
      'workerPath': WORKER_PATH
    });
    const running = pool.run([{ 'value': 'after-compose' }]);

    await signal.entered.promise;
    assert.equal(pool.messages, 0);

    signal.release.resolve();

    assert.deepEqual(await running, ['after-compose']);
    assert.equal(pool.messages, 3);
  });
});
