import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { WorkerPoolContractHarnessInterface } from './WorkerPoolContractHarnessInterface.js';

/** Registers behavior shared by the Node and browser WorkerPool adapters. */
export class WorkerPoolContract {
  static register(harness: WorkerPoolContractHarnessInterface): void {
    void describe(`${harness.name} WorkerPool contract`, () => {
      void it('bounds workers, reuses them, and preserves result order', async () => {
        const subject = harness.create({ 'maximumWorkers': 2 });
        const items = [
          { 'ms': 5, 'value': 'first' },
          { 'ms': 5, 'value': 'second' },
          { 'ms': 5, 'value': 'third' },
          { 'ms': 5, 'value': 'fourth' }
        ];

        const result = await subject.pool.run(items);

        assert.deepEqual(result, ['first', 'second', 'third', 'fourth']);
        assert.ok(subject.getCreatedWorkerCount() <= 2);
        assert.ok(subject.getCreatedWorkerCount() < items.length);

        await subject.pool.close();
      });

      void it('delivers worker failures through its lifecycle observation boundary', async () => {
        const subject = harness.create({ 'maximumWorkers': 1 });

        await WorkerPoolContract.assertRejectsWithMessage(subject.pool.run([{ 'error': 'contract failure', 'value': 'failed' }]), ['contract failure']);
        assert.equal(subject.getErrorCount(), 1);

        await subject.pool.close();
      });

      void it('delivers timeouts through its lifecycle observation boundary', async () => {
        const subject = harness.create({ 'maximumWorkers': 1, 'timeoutMs': 1 });

        await WorkerPoolContract.assertRejectsWithMessage(subject.pool.run([{ 'ms': 50, 'value': 'slow' }]), ['exceeded', 'timeout']);
        assert.equal(subject.getTimeoutCount(), 1);

        await subject.pool.close();
      });

      void it('delivers cancellation through its lifecycle observation boundary', async () => {
        const subject = harness.create({ 'maximumWorkers': 1 });
        subject.abort();

        await assert.rejects(subject.pool.run([{ 'value': 'cancelled' }]));
        assert.equal(subject.getErrorCount(), 1);

        await subject.pool.close();
      });

      void it('permanently closes after close()', async () => {
        const subject = harness.create({ 'maximumWorkers': 1 });

        await subject.pool.close();

        await WorkerPoolContract.assertRejectsWithMessage(subject.pool.run([{ 'value': 'closed' }]), ['closed']);
      });

      void it('allows a run already in progress to settle after close()', async () => {
        const subject = harness.create({ 'maximumWorkers': 1 });
        const active = subject.pool.run([{ 'ms': 10, 'value': 'in-flight' }]);

        await subject.pool.close();

        assert.deepEqual(await active, ['in-flight']);
        await WorkerPoolContract.assertRejectsWithMessage(subject.pool.run([{ 'value': 'closed' }]), ['closed']);
      });
    });
  }

  /** Asserts the rejection message contains every fragment, in order. */
  static async assertRejectsWithMessage(pending: Promise<unknown>, fragments: readonly string[]): Promise<void> {
    await assert.rejects(pending, (error) => {
      const caught: unknown = error;
      const message = caught instanceof Error ? caught.message : '';
      let cursor = 0;
      let inOrder = caught instanceof Error;
      for (let index = 0; index < fragments.length; index += 1) {
        const fragment = fragments[index] ?? '';
        const position = message.indexOf(fragment, cursor);
        inOrder = inOrder && position >= 0;
        cursor = Math.max(position, cursor);
      }
      return inOrder;
    });
  }
}
