import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { WorkerPoolInterface } from '../../src/interfaces/WorkerPoolInterface.js';

interface WorkerPoolContractItemInterface {
  readonly 'error'?: string;
  readonly 'ms'?: number;
  readonly 'value': string;
}

interface WorkerPoolContractSubjectInterface {
  readonly 'getCreatedWorkerCount': () => number;
  readonly 'getErrorCount': () => number;
  readonly 'getTimeoutCount': () => number;
  readonly 'pool': WorkerPoolInterface<WorkerPoolContractItemInterface, string>;
  readonly 'abort': () => void;
}

interface WorkerPoolContractHarnessInterface {
  readonly 'create': (options: { readonly 'maximumWorkers': number; readonly 'timeoutMs'?: number; }) => WorkerPoolContractSubjectInterface;
  readonly 'name': string;
}

/** Registers behavior shared by the Node and browser WorkerPool adapters. */
export function registerWorkerPoolContract(harness: WorkerPoolContractHarnessInterface): void {
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

      await assert.rejects(subject.pool.run([{ 'error': 'contract failure', 'value': 'failed' }]), /contract failure/u);
      assert.equal(subject.getErrorCount(), 1);

      await subject.pool.close();
    });

    void it('delivers timeouts through its lifecycle observation boundary', async () => {
      const subject = harness.create({ 'maximumWorkers': 1, 'timeoutMs': 1 });

      await assert.rejects(subject.pool.run([{ 'ms': 50, 'value': 'slow' }]), /exceeded.*timeout/u);
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

      await assert.rejects(subject.pool.run([{ 'value': 'closed' }]), /closed/u);
    });

    void it('allows a run already in progress to settle after close()', async () => {
      const subject = harness.create({ 'maximumWorkers': 1 });
      const active = subject.pool.run([{ 'ms': 10, 'value': 'in-flight' }]);

      await subject.pool.close();

      assert.deepEqual(await active, ['in-flight']);
      await assert.rejects(subject.pool.run([{ 'value': 'closed' }]), /closed/u);
    });
  });
}
