import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { WorkerPool } from '../../src/WorkerPool.js';

const WORKER_PATH = new URL('../fixtures/reusableEchoWorker.mjs', import.meta.url).pathname;

type ItemType = { 'value': string; 'ms'?: number };

describe('WorkerPool pooling', () => {
  it('reuses long-lived workers across a run() call instead of spawning one per item', async () => {
    const threadIds: number[] = [];

    class ObservingPool extends WorkerPool<ItemType, string> {
      protected override onWorkerCreated(threadId: number): void {
        threadIds.push(threadId);
      }
    }

    const concurrency = 2;
    const itemCount = 8;
    const pool = ObservingPool.create({ 'concurrency': concurrency, 'workerPath': WORKER_PATH });

    const items: ItemType[] = Array.from({ 'length': itemCount }, (_unused, index) => ({ 'ms': 5, 'value': `item-${String(index)}` }));

    const results = await pool.run(items);

    assert.equal(results.length, itemCount);
    assert.deepEqual(results, items.map((item) => item.value));

    const distinctThreadIds = new Set(threadIds);
    assert.equal(distinctThreadIds.size <= concurrency, true, `expected distinct threadIds <= ${String(concurrency)}, got ${String(distinctThreadIds.size)}`);
    assert.equal(distinctThreadIds.size < itemCount, true, `expected distinct threadIds < ${String(itemCount)}, got ${String(distinctThreadIds.size)}`);
  });
});
