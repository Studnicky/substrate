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
});
