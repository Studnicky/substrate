/**
 * Batch Hooks Tests
 *
 * Asserts that every lifecycle hook fires at the correct stage,
 * the correct number of times, and with correct arguments for both process()
 * and processSettled().
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { BatchStatsType } from '../../../src/interfaces/index.js';
import { Batch } from '../../../src/batch/Batch.js';
import { collectBatches } from '../../helpers/index.js';

// ── RecordingBatch ────────────────────────────────────────────────────────────

class RecordingBatch<TResult = unknown> extends Batch<TResult> {
  public constructor(maxConcurrent?: number) { super(maxConcurrent); }

  public batchStartArgs: number[] = [];
  public itemStartArgs: number[] = [];
  public itemSuccessArgs: Array<[number, TResult]> = [];
  public itemErrorArgs: Array<[number, unknown]> = [];
  public itemSettledArgs: number[] = [];
  public concurrencySaturatedCount = 0;
  public batchCompleteArgs: BatchStatsType[] = [];

  protected override onBatchStart(total: number): void { this.batchStartArgs.push(total); }
  protected override onConcurrencySaturated(): void { this.concurrencySaturatedCount++; }
  protected override onItemStart(index: number): void { this.itemStartArgs.push(index); }
  protected override onItemSuccess(index: number, result: TResult): void { this.itemSuccessArgs.push([index, result]); }
  protected override onItemError(index: number, error: unknown): void { this.itemErrorArgs.push([index, error]); }
  protected override onItemSettled(index: number): void { this.itemSettledArgs.push(index); }
  protected override onBatchComplete(stats: BatchStatsType): void { this.batchCompleteArgs.push(stats); }
}

// ── process() hooks ───────────────────────────────────────────────────────────

it('process hooks: onBatchStart fires once with total item count', async () => {
  const rec = new RecordingBatch<number>(2);
  const items = [10, 20, 30, 40, 50];

  for await (const _ of rec.process(items, async (n) => { return n; })) { /* consume */ }

  assert.strictEqual(rec.batchStartArgs.length, 1);
  assert.strictEqual(rec.batchStartArgs[0], 5);
});

it('process hooks: onItemStart fires once per item in global-index order', async () => {
  const rec = new RecordingBatch<number>(2);
  const items = [1, 2, 3, 4];

  for await (const _ of rec.process(items, async (n) => { return n; })) { /* consume */ }

  assert.strictEqual(rec.itemStartArgs.length, 4);
  assert.deepStrictEqual(rec.itemStartArgs.slice().sort((a, b) => { return a - b; }), [0, 1, 2, 3]);
});

it('process hooks: onItemSuccess fires for every resolved item with correct index and result', async () => {
  const rec = new RecordingBatch<number>(3);
  const items = [10, 20, 30];

  for await (const _ of rec.process(items, async (n) => { return n * 2; })) { /* consume */ }

  assert.strictEqual(rec.itemSuccessArgs.length, 3);

  const sorted = rec.itemSuccessArgs.slice().sort((a, b) => { return a[0] - b[0]; });

  assert.deepStrictEqual(sorted[0], [0, 20]);
  assert.deepStrictEqual(sorted[1], [1, 40]);
  assert.deepStrictEqual(sorted[2], [2, 60]);
});

it('process hooks: onItemError fires for a failing item before propagation', async () => {
  const rec = new RecordingBatch<number>(3);
  const items = [1, 2, 3];
  const boom = new Error('boom');

  const run = async (): Promise<void> => {
    for await (const _ of rec.process(
      items,
      async (n) => {
        if (n === 2) { throw boom; }
        return n;
      }
    )) { /* consume */ }
  };

  await assert.rejects(run, /boom/u);

  assert.strictEqual(rec.itemErrorArgs.length, 1);
  assert.strictEqual(rec.itemErrorArgs[0]![0], 1);
  assert.strictEqual(rec.itemErrorArgs[0]![1], boom);
});

it('process hooks: onItemSettled fires for every item, success and error', async () => {
  const rec = new RecordingBatch<number>(3);
  const items = [1, 2, 3];

  const run = async (): Promise<void> => {
    for await (const _ of rec.process(
      items,
      async (n) => {
        if (n === 2) { throw new Error('oops'); }
        return n;
      }
    )) { /* consume */ }
  };

  await assert.rejects(run);

  // All 3 items settled (success, error, success) — Promise.all rejects after all settle
  assert.strictEqual(rec.itemSettledArgs.length, 3);
  assert.deepStrictEqual(rec.itemSettledArgs.slice().sort((a, b) => { return a - b; }), [0, 1, 2]);
});

it('process hooks: onItemSettled fires after onItemSuccess for resolved items', async () => {
  const order: string[] = [];
  const items = [42];

  class OrderBatch extends Batch<number> {
    public constructor() { super(); }
    protected override onItemSuccess(index: number): void { order.push(`success-${index}`); }
    protected override onItemSettled(index: number): void { order.push(`settled-${index}`); }
  }

  const batch = new OrderBatch();
  for await (const _ of batch.process(items, async (n) => { return n; })) { /* consume */ }

  assert.deepStrictEqual(order, ['success-0', 'settled-0']);
});

it('process hooks: onItemSettled fires after onItemError for rejected items', async () => {
  const order: string[] = [];
  const items = [1];

  class OrderBatch extends Batch<number> {
    public constructor() { super(); }
    protected override onItemError(index: number): void { order.push(`error-${index}`); }
    protected override onItemSettled(index: number): void { order.push(`settled-${index}`); }
  }

  const batch = new OrderBatch();
  const run = async (): Promise<void> => {
    for await (const _ of batch.process(items, async () => { throw new Error('fail'); })) { /* consume */ }
  };

  await assert.rejects(run);
  assert.deepStrictEqual(order, ['error-0', 'settled-0']);
});

it('process hooks: onConcurrencySaturated fires when batch fills concurrency window', async () => {
  const rec = new RecordingBatch<number>(2);
  // 5 items, concurrency 2 → batches [0,1], [2,3], [4]
  // saturated for first two batches (batch.length === maxConcurrent); last batch has 1 item, not saturated
  const items = [1, 2, 3, 4, 5];

  for await (const _ of rec.process(items, async (n) => { return n; })) { /* consume */ }

  assert.strictEqual(rec.concurrencySaturatedCount, 2);
});

it('process hooks: onBatchComplete fires once with correct stats (all success)', async () => {
  const rec = new RecordingBatch<number>(4);
  const items = [1, 2, 3, 4];

  for await (const _ of rec.process(items, async (n) => { return n; })) { /* consume */ }

  assert.strictEqual(rec.batchCompleteArgs.length, 1);
  assert.deepStrictEqual(rec.batchCompleteArgs[0], { 'failed': 0, 'succeeded': 4, 'total': 4 });
});

it('process hooks: onBatchComplete does not fire when an error aborts the run', async () => {
  // process() uses Promise.all — a rejection propagates immediately and the
  // generator terminates before onBatchComplete can be reached.
  const rec = new RecordingBatch<number>(3);
  const items = [1, 2, 3];

  const run = async (): Promise<void> => {
    for await (const _ of rec.process(
      items,
      async (n) => {
        if (n === 1) { throw new Error('abort'); }
        return n;
      }
    )) { /* consume */ }
  };

  await assert.rejects(run, /abort/u);
  assert.strictEqual(rec.batchCompleteArgs.length, 0);
});

it('process yields correct results without overriding hooks', async () => {
  const batch = Batch.create<number>(2);
  const results = await collectBatches(batch.process([1, 2, 3], async (n) => n * 2));
  assert.deepStrictEqual(results, [2, 4, 6]);
});

it('processSettled yields correct results without overriding hooks', async () => {
  const batch = Batch.create<number>(2);
  const results = await collectBatches(batch.processSettled([1, 2, 3], async (n) => n * 2));
  assert.deepStrictEqual(results.map((r) => (r as PromiseFulfilledResult<number>).value), [2, 4, 6]);
});

// ── processSettled() hooks ────────────────────────────────────────────────────

it('processSettled hooks: onBatchStart fires once with total item count', async () => {
  const rec = new RecordingBatch<number>(3);
  const items = [1, 2, 3];

  for await (const _ of rec.processSettled(items, async (n) => { return n; })) { /* consume */ }

  assert.strictEqual(rec.batchStartArgs.length, 1);
  assert.strictEqual(rec.batchStartArgs[0], 3);
});

it('processSettled hooks: onItemSuccess fires for resolved items, onItemError for rejected', async () => {
  const rec = new RecordingBatch<number>(3);
  const items = [1, 2, 3];

  for await (const _ of rec.processSettled(
    items,
    async (n) => {
      if (n === 2) { throw new Error('partial fail'); }
      return n * 10;
    }
  )) { /* consume */ }

  assert.strictEqual(rec.itemSuccessArgs.length, 2);
  assert.strictEqual(rec.itemErrorArgs.length, 1);
  assert.strictEqual(rec.itemErrorArgs[0]![0], 1);
});

it('processSettled hooks: onItemSettled fires for every item including failures', async () => {
  const rec = new RecordingBatch<number>(4);
  const items = [1, 2, 3, 4];

  for await (const _ of rec.processSettled(
    items,
    async (n) => {
      if (n === 3) { throw new Error('fail'); }
      return n;
    }
  )) { /* consume */ }

  assert.strictEqual(rec.itemSettledArgs.length, 4);
  assert.deepStrictEqual(rec.itemSettledArgs.slice().sort((a, b) => { return a - b; }), [0, 1, 2, 3]);
});

it('processSettled hooks: onBatchComplete fires with correct failed count', async () => {
  const rec = new RecordingBatch<number>(5);
  const items = [1, 2, 3, 4, 5];

  for await (const _ of rec.processSettled(
    items,
    async (n) => {
      if (n === 2 || n === 4) { throw new Error('fail'); }
      return n;
    }
  )) { /* consume */ }

  assert.strictEqual(rec.batchCompleteArgs.length, 1);
  assert.deepStrictEqual(rec.batchCompleteArgs[0], { 'failed': 2, 'succeeded': 3, 'total': 5 });
});

it('processSettled hooks: onConcurrencySaturated fires only for full batches', async () => {
  const rec = new RecordingBatch<number>(2);
  // 5 items, concurrency 2 → batches [0,1], [2,3], [4]
  // first two batches are full → 2 saturation events
  const items = [1, 2, 3, 4, 5];

  for await (const _ of rec.processSettled(items, async (n) => { return n; })) { /* consume */ }

  assert.strictEqual(rec.concurrencySaturatedCount, 2);
});

it('processSettled hooks: global indices span across batches correctly', async () => {
  const rec = new RecordingBatch<string>(2);
  const items = ['a', 'b', 'c', 'd'];

  for await (const _ of rec.processSettled(items, async (s) => { return s.toUpperCase(); })) { /* consume */ }

  // indices must be 0,1,2,3 across both batches
  const startsSorted = rec.itemStartArgs.slice().sort((a, b) => { return a - b; });

  assert.deepStrictEqual(startsSorted, [0, 1, 2, 3]);

  const settledSorted = rec.itemSettledArgs.slice().sort((a, b) => { return a - b; });

  assert.deepStrictEqual(settledSorted, [0, 1, 2, 3]);

  const successSorted = rec.itemSuccessArgs.slice().sort((a, b) => { return a[0] - b[0]; });

  assert.deepStrictEqual(
    successSorted.map((e) => { return e[1]; }),
    ['A', 'B', 'C', 'D']
  );
});

it('processSettled hooks: onBatchComplete fires even when all items fail', async () => {
  const rec = new RecordingBatch<number>(3);
  const items = [1, 2, 3];

  for await (const _ of rec.processSettled(
    items,
    async () => { throw new Error('always fails'); }
  )) { /* consume */ }

  assert.strictEqual(rec.batchCompleteArgs.length, 1);
  assert.deepStrictEqual(rec.batchCompleteArgs[0], { 'failed': 3, 'succeeded': 0, 'total': 3 });
});
