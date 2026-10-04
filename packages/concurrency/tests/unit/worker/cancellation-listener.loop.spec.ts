import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { describe, it } from 'node:test';
import { setTimeout } from 'node:timers/promises';

import type { WorkerPoolConfigInterface } from '../../../src/worker/interfaces/WorkerPoolConfigInterface.js';
import type { WorkerPoolContractItemInterface } from '../../helpers/worker/WorkerPoolContractItemInterface.js';

import { WorkerPool } from '../../../src/worker/WorkerPool.js';
import { WorkerFixturePath } from '../../helpers/worker/WorkerFixturePath.js';

void describe('WorkerPool caller-signal listener discipline', () => {
  void it("holds exactly one abort listener on the caller-supplied signal for a task's entire lifetime, and none after it settles", async () => {
    const controller = new AbortController();
    const config: WorkerPoolConfigInterface = {
      'abortSignal': controller.signal,
      'workerPath': WorkerFixturePath.resolveFromModule('../../fixtures/worker/echoWorker.ts', import.meta.url)
    };
    const pool = WorkerPool.create<WorkerPoolContractItemInterface, string>(config);

    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);

    const running = pool.run([{ 'ms': 150, 'value': 'a' }]);

    // Early: the worker is likely still starting.
    await setTimeout(5);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 1);

    // Later: the worker has certainly booted and is mid-task.
    await setTimeout(120);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 1);

    assert.deepEqual(await running, ['a']);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });

  void it('cancels a task via the caller signal while its worker is still starting', async () => {
    const controller = new AbortController();
    const cancellationReason = RuntimeError.create('cancelled during startup');

    class AbortOnCreatePool extends WorkerPool<WorkerPoolContractItemInterface, string> {
      protected override onWorkerCreated(_threadId: number): void {
        // Fires synchronously as soon as the worker thread is constructed — strictly before the
        // async 'online' event, so this reliably lands inside the startup window.
        controller.abort(cancellationReason);
      }
    }

    const pool = AbortOnCreatePool.create<
      WorkerPoolContractItemInterface,
      string,
      AbortOnCreatePool
    >({
      'abortSignal': controller.signal,
      'startupTimeoutMs': 5000,
      'workerPath': WorkerFixturePath.resolveFromModule('../../fixtures/worker/echoWorker.ts', import.meta.url)
    });

    await assert.rejects(pool.run([{ 'value': 'never-starts' }]), (error) => {
      const caught: unknown = error;
      assert.ok(caught instanceof Error);
      assert.ok(caught.message.includes('cancelled before its worker finished starting'));
      assert.strictEqual(caught.cause, cancellationReason);
      return true;
    });

    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });

  void it('cancels a task via the caller signal while its worker is already executing the task', async () => {
    const controller = new AbortController();
    const cancellationReason = RuntimeError.create('cancelled during task execution');

    const pool = WorkerPool.create<WorkerPoolContractItemInterface, string>({
      'abortSignal': controller.signal,
      'workerPath': WorkerFixturePath.resolveFromModule('../../fixtures/worker/echoWorker.ts', import.meta.url)
    });

    const running = pool.run([{ 'ms': 5000, 'value': 'slow' }]);
    // Give the worker time to boot and start executing before cancelling, so this exercises
    // the task phase specifically, not the startup phase covered by the previous test.
    await setTimeout(150);
    controller.abort(cancellationReason);

    await assert.rejects(running, (error) => {
      const caught: unknown = error;
      assert.ok(caught instanceof Error);
      assert.ok(caught.message.includes('was cancelled'));
      assert.ok(!caught.message.includes('finished starting'));
      assert.strictEqual(caught.cause, cancellationReason);
      return true;
    });

    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });
});
