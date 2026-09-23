import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Worker } from 'node:worker_threads';

import { Signal } from '@studnicky/signal/node';

import { WorkerPool } from '../../src/WorkerPool.js';
import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';

interface ItemInterface {
  readonly 'value': string;
}

function resolveWorkerPath(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

/**
 * Kills the worker `compose()` is being called for, waits for the pool's own `exit`
 * handler to delete it from `workerRecords`, then rejects — landing `assignTask` on its
 * `record === undefined` branch for that worker. Real worker threads, real `exit` events;
 * this is the only way to reach that branch without touching the pool's private closures.
 */
class WorkerKillingSignal extends Signal {
  #armed = 0;
  readonly killed: Worker[] = [];

  arm(times: number): void {
    this.#armed = times;
  }

  protected override async onCompose(): Promise<void> {
    if (this.#armed <= 0) { return; }
    this.#armed -= 1;
    // LIFO: the worker just handed to THIS compose() call is always the most recently
    // registered one — a FIFO queue can instead hand back a self-healed replacement worker
    // spawned by an earlier kill, killing a worker that is mid-task rather than mid-assignment.
    const worker = WorkerKillingSignal.#activeWorkers.pop();
    if (worker === undefined) { return; }
    this.killed.push(worker);
    const exited = new Promise<void>((resolve) => { worker.once('exit', () => { resolve(); }); });
    await worker.terminate().catch(() => {});
    await exited;
    throw new Error(`WorkerKillingSignal: forced compose failure after killing worker ${String(this.killed.length)}`);
  }

  static #activeWorkers: Worker[] = [];

  /** Records every worker as it registers for 'online' — the same moment `createWorker` adds it to `workerRecords`. */
  static install(): () => void {
    const originalOnce = Worker.prototype.once;
    WorkerKillingSignal.#activeWorkers = [];
    Worker.prototype.once = function patchedOnce(
      this: Worker,
      event: string | symbol,
      listener: (...args: unknown[]) => void
    ): Worker {
      if (event === 'online') { WorkerKillingSignal.#activeWorkers.push(this); }
      return originalOnce.call(this, event, listener);
    };
    return () => { Worker.prototype.once = originalOnce; };
  }
}

async function flushTurn(): Promise<void> {
  await new Promise((resolve) => { setImmediate(resolve); });
}

void describe('WorkerPool assignTask record === undefined branch', () => {
  it('recovers when a worker dies mid-assignment while other tasks are already queued', async () => {
    const uninstall = WorkerKillingSignal.install();
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const signal = WorkerKillingSignal.create<WorkerKillingSignal>();
      // concurrency === 1: exactly one worker is ever created directly by dispatch(), so the
      // single armed kill can only ever target it — no ambiguity with any self-healed
      // replacement. batchConcurrency === 4 dispatches all four items in the same window, so
      // items 1-3 are already queued in `pendingQueue` by the time the kill lands.
      signal.arm(1);

      const config: WorkerPoolConfigInterface = {
        'batchConcurrency': 4,
        'concurrency': 1,
        'signal': signal,
        'workerPath': resolveWorkerPath('../fixtures/reusableEchoWorker.ts')
      };
      const pool = WorkerPool.create<ItemInterface, string>(config);

      const items: ItemInterface[] = [{ 'value': 'i0' }, { 'value': 'i1' }, { 'value': 'i2' }, { 'value': 'i3' }];

      await assert.rejects(pool.run(items), (error: Error) => {
        assert.ok(error.cause instanceof Error && error.cause.message.includes('forced compose failure'));
        return true;
      });

      assert.equal(signal.killed.length, 1);
      await flushTurn();
      assert.deepStrictEqual(rejectionEvents, []);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
      uninstall();
    }
  });
});
