import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { WorkerPool } from '../../src/WorkerPool.js';

const WORKER_PATH = new URL('../fixtures/echoWorker.mjs', import.meta.url).pathname;

type ItemType = { 'value': string; 'ms'?: number };

describe('WorkerPool timeout', () => {
  it('terminates a worker that exceeds timeoutMs and rejects that task, firing onWorkerTimeout', async () => {
    const timedOutIndexes: number[] = [];

    class TimeoutObservingPool extends WorkerPool<ItemType, string> {
      protected override onWorkerTimeout(index: number): void {
        timedOutIndexes.push(index);
      }
    }

    const pool = TimeoutObservingPool.create({
      'concurrency': 1,
      'timeoutMs': 200,
      'workerPath': WORKER_PATH
    }) as TimeoutObservingPool;

    // The task's own artificial delay (5s) vastly exceeds timeoutMs (200ms), so the timeout
    // fires reliably even under heavy CI/thread-spin-up contention.
    await assert.rejects(
      pool.run([{ 'ms': 5000, 'value': 'too-slow' }]),
      /exceeded its timeout/
    );

    assert.deepEqual(timedOutIndexes, [0]);
  });

  it('a task within timeoutMs resolves normally', async () => {
    const pool = WorkerPool.create<ItemType, string>({
      'concurrency': 1,
      'timeoutMs': 20000,
      'workerPath': WORKER_PATH
    });

    // timeoutMs is deliberately generous relative to the task's own 10ms delay, so worker
    // spin-up jitter under heavy CI/thread contention cannot make this falsely time out.
    const results = await pool.run([{ 'ms': 10, 'value': 'fast' }]);
    assert.deepEqual(results, ['fast']);
  });
});
