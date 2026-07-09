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

  it('getSignal() returns the composed Signal instance', () => {
    const signal = Signal.create();
    const pool = WorkerPool.create({ 'signal': signal, 'workerPath': WORKER_PATH });
    assert.equal(pool.getSignal(), signal);
  });

  it('getSignal() returns a fresh Signal when none is composed', () => {
    const pool = WorkerPool.create({ 'workerPath': WORKER_PATH });
    assert.equal(pool.getSignal() instanceof Signal, true);
  });
});

describe('WorkerPool.builder', () => {
  it('throws when build() is called without workerPath', () => {
    assert.throws(() => WorkerPool.builder().build(), /workerPath is required/);
  });

  it('builds a functioning pool from a fluent chain', async () => {
    const pool = WorkerPool.builder<{ value: string }, string>()
      .workerPath(WORKER_PATH)
      .concurrency(2)
      .build();

    const results = await pool.run([{ 'value': 'a' }]);
    assert.deepEqual(results, ['a']);
  });
});
