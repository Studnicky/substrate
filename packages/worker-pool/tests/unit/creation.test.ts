import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Signal } from '@studnicky/signal';

import { WorkerPool } from '../../src/WorkerPool.js';

const WORKER_PATH = new URL('../fixtures/echoWorker.mjs', import.meta.url).pathname;

describe('WorkerPool.create', () => {
  it('throws when workerPath is missing', () => {
    assert.throws(() => WorkerPool.create({ 'workerPath': '' }), /workerPath is required/);
  });

  it('runs successfully when concurrency is omitted, defaulting to System.optimalWorkerCount', async () => {
    const pool = WorkerPool.create<{ value: string }, string>({ 'workerPath': WORKER_PATH });
    const results = await pool.run([{ 'value': 'a' }]);
    assert.deepEqual(results, ['a']);
  });

  it('uses a caller-supplied Signal for task deadlines', async () => {
    class TrackingSignal extends Signal {
      calls = 0;

      constructor() {
        super();
      }

      protected override onCompose(): void {
        this.calls += 1;
      }
    }

    const signal = new TrackingSignal();
    const pool = WorkerPool.create<{ value: string }, string>({
      'signal': signal,
      'timeoutMs': 1000,
      'workerPath': WORKER_PATH
    });

    assert.deepEqual(await pool.run([{ 'value': 'a' }]), ['a']);
    assert.equal(signal.calls, 1);
  });
});

describe('WorkerPool.create with explicit options', () => {
  it('builds a functioning pool with bounded concurrency', async () => {
    const pool = WorkerPool.create<{ value: string }, string>({
      'concurrency': 2,
      'workerPath': WORKER_PATH
    });

    const results = await pool.run([{ 'value': 'a' }]);
    assert.deepEqual(results, ['a']);
  });
});
