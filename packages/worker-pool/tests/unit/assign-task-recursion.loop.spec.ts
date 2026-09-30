import { RuntimeError } from '@studnicky/errors/node';
import { Signal } from '@studnicky/signal/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { Worker } from 'node:worker_threads';

import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';

import { WorkerPool } from '../../src/WorkerPool.js';
import { WorkerFixturePath } from '../helpers/WorkerFixturePath.js';

interface ItemInterface {
  readonly 'value': string;
}

/**
 * Kills the worker `compose()` is being called for, waits for the pool's own `exit`
 * handler to delete it from `workerRecords`, then rejects — landing `assignTask` on its
 * `record === undefined` branch for that worker. Real worker threads, real `exit` events;
 * this is the only way to reach that branch without touching the pool's private closures.
 */
class WorkerKillingSignal extends Signal {
  static override create(): WorkerKillingSignal {
    const signal = new WorkerKillingSignal();
    return signal;
  }

  /** Records every worker as it registers for 'online' — the same moment `createWorker` adds it to `workerRecords`. */
  static observeRegistration(worker: unknown, event: unknown): void {
    if (WorkerKillingSignal.#recording && event === 'online' && worker instanceof Worker) {
      WorkerKillingSignal.#activeWorkers.push(worker);
    }
  }

  static startRecording(): void {
    WorkerKillingSignal.#activeWorkers = [];
    WorkerKillingSignal.#recording = true;
  }

  static stopRecording(): void {
    WorkerKillingSignal.#recording = false;
  }

  static #activeWorkers: Worker[] = [];
  static #recording = false;
  #armed = 0;
  readonly killed: Worker[] = [];

  arm(times: number): void {
    this.#armed = times;
  }

  protected override async onCompose(): Promise<void> {
    if (this.#armed > 0) {
      this.#armed -= 1;
      // LIFO: the worker just handed to THIS compose() call is always the most recently
      // registered one — a FIFO queue can instead hand back a self-healed replacement worker
      // spawned by an earlier kill, killing a worker that is mid-task rather than mid-assignment.
      const worker = WorkerKillingSignal.#activeWorkers.pop();
      if (worker !== undefined) {
        this.killed.push(worker);
        const exited = new Promise<void>((resolve) => { worker.once('exit', () => { resolve(); }); });
        await worker.terminate().catch(() => {});
        await exited;
        throw RuntimeError.create(`WorkerKillingSignal: forced compose failure after killing worker ${String(this.killed.length)}`);
      }
    }
  }
}

const originalWorkerOnce = Worker.prototype.once;
Worker.prototype.once = new Proxy(originalWorkerOnce, {
  'apply': (target, thisArg: unknown, argumentList: Parameters<typeof originalWorkerOnce>): Worker => {
    WorkerKillingSignal.observeRegistration(thisArg, argumentList[0]);
    const returned: unknown = Reflect.apply(target, thisArg, argumentList);
    assert.ok(returned instanceof Worker);
    return returned;
  }
});

void describe('WorkerPool assignTask record === undefined branch', () => {
  void it('recovers when a worker dies mid-assignment while other tasks are already queued', async () => {
    WorkerKillingSignal.startRecording();
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const signal = WorkerKillingSignal.create();
      // concurrency === 1: exactly one worker is ever created directly by dispatch(), so the
      // single armed kill can only ever target it — no ambiguity with any self-healed
      // replacement. batchConcurrency === 4 dispatches all four items in the same window, so
      // items 1-3 are already queued in `pendingQueue` by the time the kill lands.
      signal.arm(1);

      const config: WorkerPoolConfigInterface = {
        'batchConcurrency': 4,
        'concurrency': 1,
        'signal': signal,
        'workerPath': WorkerFixturePath.resolve('../fixtures/reusableEchoWorker.ts')
      };
      const pool = WorkerPool.create<ItemInterface, string>(config);

      const items: ItemInterface[] = [{ 'value': 'i0' }, { 'value': 'i1' }, { 'value': 'i2' }, { 'value': 'i3' }];

      await assert.rejects(pool.run(items), (error) => {
        const caught: unknown = error;
        assert.ok(caught instanceof Error);
        assert.ok(caught.cause instanceof Error && caught.cause.message.includes('forced compose failure'));
        return true;
      });

      assert.equal(signal.killed.length, 1);
      await setImmediate();
      assert.deepStrictEqual(rejectionEvents, []);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
      WorkerKillingSignal.stopRecording();
    }
  });
});
