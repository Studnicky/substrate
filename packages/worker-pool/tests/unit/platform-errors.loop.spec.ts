import { Signal } from '@studnicky/signal/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setTimeout } from 'node:timers/promises';

import { WorkerPoolError } from '../../src/errors/WorkerPoolError.js';
import { WorkerPool } from '../../src/WorkerPool.js';

class SlowComposeSignal extends Signal {
  static override create(): SlowComposeSignal {
    return new SlowComposeSignal();
  }

  protected override async onCompose(): Promise<void> {
    await setTimeout(300);
  }
}

void describe('WorkerPool platform failures', () => {
  void it('rejects run() with a WorkerPoolError carrying the worker_threads error as cause when the worker script cannot load', async () => {
    const pool = WorkerPool.create<number, number>({ 'concurrency': 1, 'workerPath': '/nonexistent/worker.mjs' });

    await assert.rejects(pool.run([1]), (error) => {
      const caught: unknown = error;
      assert.ok(caught instanceof WorkerPoolError);
      assert.equal(caught.code, 'workerPool.workerFailed');
      assert.ok(caught.cause instanceof Error);
      assert.equal(caught.message, caught.cause.message);
      return true;
    });
  });

  void it('rejects run() when the worker dies before its task is dispatched', { 'timeout': 10_000 }, async () => {
    const pool = WorkerPool.create<number, number>({
      'concurrency': 1,
      'signal': SlowComposeSignal.create(),
      'workerPath': '/nonexistent/worker.mjs'
    });

    await assert.rejects(pool.run([1]), (error) => {
      const caught: unknown = error;
      assert.ok(caught instanceof WorkerPoolError);
      assert.equal(caught.code, 'workerPool.workerFailed');
      assert.ok(caught.cause instanceof Error);
      return true;
    });
  });
});

void describe('WorkerPoolError.from', () => {
  void it('returns a BaseError unchanged', () => {
    const named = new WorkerPoolError({ 'code': 'workerPool.example', 'message': 'named' });

    assert.equal(WorkerPoolError.from(named, 'workerPool.wrapped', 'wrapped'), named);
  });

  void it('wraps any other thrown value with the original as cause', () => {
    const thrown = 'platform-value';
    const wrapped = WorkerPoolError.from(thrown, 'workerPool.wrapped', 'wrapped');

    assert.ok(wrapped instanceof WorkerPoolError);
    assert.ok(wrapped instanceof BaseError);
    assert.equal(wrapped.code, 'workerPool.wrapped');
    assert.equal(wrapped.message, 'wrapped');
    assert.equal(wrapped.cause, thrown);
  });
});
