import { getEventListeners } from 'node:events';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WorkerPoolError } from '../../src/errors/WorkerPoolError.js';
import { WorkerPool } from '../../src/WorkerPool.js';
import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';

interface ItemInterface {
  ms?: number;
  value: string;
}

function resolveWorkerPath(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

void describe('WorkerPool caller-signal listener discipline', () => {
  void it('holds exactly one abort listener on the caller-supplied signal for a task\'s entire lifetime, and none after it settles', async () => {
    const controller = new AbortController();
    const config: WorkerPoolConfigInterface = {
      'abortSignal': controller.signal,
      'workerPath': resolveWorkerPath('../fixtures/echoWorker.ts')
    };
    const pool = WorkerPool.create<ItemInterface, string>(config);

    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);

    const running = pool.run([{ 'ms': 150, 'value': 'a' }]);

    // Early: the worker is likely still starting.
    await wait(5);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 1);

    // Later: the worker has certainly booted and is mid-task.
    await wait(120);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 1);

    assert.deepEqual(await running, ['a']);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });

  void it('cancels a task via the caller signal while its worker is still starting', async () => {
    const controller = new AbortController();
    const cancellationReason = new Error('cancelled during startup');

    class AbortOnCreatePool extends WorkerPool<ItemInterface, string> {
      protected override onWorkerCreated(_threadId: number): void {
        // Fires synchronously as soon as the worker thread is constructed — strictly before the
        // async 'online' event, so this reliably lands inside the startup window.
        controller.abort(cancellationReason);
      }
    }

    const pool = AbortOnCreatePool.create<ItemInterface, string, AbortOnCreatePool>({
      'abortSignal': controller.signal,
      'startupTimeoutMs': 5000,
      'workerPath': resolveWorkerPath('../fixtures/echoWorker.ts')
    });

    await assert.rejects(pool.run([{ 'value': 'never-starts' }]), (error: Error) => {
      assert.ok(error.message.includes('cancelled before its worker finished starting'));
      assert.ok(error.cause instanceof WorkerPoolError);
      assert.equal(error.cause.code, 'workerPool.cancelled');
      assert.equal(error.cause.cause, cancellationReason);
      return true;
    });

    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });

  void it('cancels a task via the caller signal while its worker is already executing the task', async () => {
    const controller = new AbortController();
    const cancellationReason = new Error('cancelled during task execution');

    const pool = WorkerPool.create<ItemInterface, string>({
      'abortSignal': controller.signal,
      'workerPath': resolveWorkerPath('../fixtures/echoWorker.ts')
    });

    const running = pool.run([{ 'ms': 5000, 'value': 'slow' }]);
    // Give the worker time to boot and start executing before cancelling, so this exercises
    // the task phase specifically, not the startup phase covered by the previous test.
    await wait(150);
    controller.abort(cancellationReason);

    await assert.rejects(running, (error: Error) => {
      assert.ok(error.message.includes('was cancelled'));
      assert.ok(!error.message.includes('finished starting'));
      assert.ok(error.cause instanceof WorkerPoolError);
      assert.equal(error.cause.code, 'workerPool.cancelled');
      assert.equal(error.cause.cause, cancellationReason);
      return true;
    });

    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });
});
