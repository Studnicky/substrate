import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { WorkerPool } from '../../src/WorkerPool.js';

const WORKER_PATH = new URL('../fixtures/echoWorker.mjs', import.meta.url).pathname;
const CONCURRENCY_WORKER_PATH = new URL('../fixtures/concurrencyWorker.mjs', import.meta.url).pathname;

type ItemType = { 'value': string; 'ms'?: number; 'error'?: string };

describe('WorkerPool#run', () => {
  it('resolves results in the same order as the input items', async () => {
    const pool = WorkerPool.create<ItemType, string>({ 'concurrency': 4, 'workerPath': WORKER_PATH });

    // Deliberately vary delays so a naive implementation that resolves in completion order
    // (rather than input order) would produce a scrambled array.
    const items: ItemType[] = [
      { 'ms': 40, 'value': 'a' },
      { 'ms': 5, 'value': 'b' },
      { 'ms': 25, 'value': 'c' },
      { 'ms': 1, 'value': 'd' }
    ];

    const results = await pool.run(items);
    assert.deepEqual(results, ['a', 'b', 'c', 'd']);
  });

  it('bounds concurrency: never more than `concurrency` workers run simultaneously, but more than one runs at once', async () => {
    // Wall-clock timing is flaky here — worker spin-up cost varies wildly under CI/thread
    // contention and can dwarf a short artificial delay. Prove the bound deterministically
    // instead, via a SharedArrayBuffer active-worker counter the fixture updates atomically.
    const concurrency = 2;
    const itemCount = 6;

    const pool = WorkerPool.create<{ counts: SharedArrayBuffer; ms: number; value: string }, string>({
      'concurrency': concurrency,
      'workerPath': CONCURRENCY_WORKER_PATH
    });

    const sab = new SharedArrayBuffer(2 * Int32Array.BYTES_PER_ELEMENT);
    const counts = new Int32Array(sab);
    counts[0] = 0;
    counts[1] = 0;

    // ms is generous relative to worker spin-up time so two workers scheduled back-to-back are
    // overwhelmingly likely to have their "active" windows overlap even under heavy CI/thread
    // contention, keeping this assertion non-flaky without being purely timing-based.
    const items = Array.from({ 'length': itemCount }, (_unused, index) => ({
      'counts': sab,
      'ms': 500,
      'value': `item-${String(index)}`
    }));

    const results = await pool.run(items);
    assert.equal(results.length, itemCount);

    const observedMax = counts[1];
    // Bounded: never exceeds the configured concurrency.
    assert.equal(observedMax <= concurrency, true, `expected observed max concurrency <= ${String(concurrency)}, got ${String(observedMax)}`);
    // Actually parallel: more than one worker was active at once at some point.
    assert.equal(observedMax > 1, true, `expected observed max concurrency > 1, got ${String(observedMax)}`);
  });

  it('a worker error rejects the whole run() call (Promise.all-like fail-fast), without aborting items already in flight', async () => {
    const observedResults: string[] = [];

    class ObservingPool extends WorkerPool<ItemType, string> {
      protected override onMessage(envelope: { type: string; value?: string }): void {
        if (envelope.type === 'result' && envelope.value !== undefined) {
          observedResults.push(envelope.value);
        }
      }
    }

    const pool = ObservingPool.create({ 'concurrency': 2, 'workerPath': WORKER_PATH });

    // Chunk 1 = [a, b] both succeed; chunk 2 = [c (errors), d] — Promise.all in chunk 2 rejects
    // on c, but the whole call rejects only after chunk 1 has already fully resolved. Whether
    // 'd' (same chunk as 'c', not delayed) posts its result before or after the overall promise
    // settles is a genuine race — Promise.all does not abort settled-but-still-running siblings —
    // so only 'a' and 'b' (guaranteed complete before chunk 2 even starts) are asserted exactly.
    const items: ItemType[] = [
      { 'value': 'a' },
      { 'value': 'b' },
      { 'error': 'boom', 'value': 'c' },
      { 'value': 'd' }
    ];

    await assert.rejects(pool.run(items), /boom/);
    assert.equal(observedResults.includes('a'), true);
    assert.equal(observedResults.includes('b'), true);
    assert.equal(observedResults.includes('c'), false);
  });
});
