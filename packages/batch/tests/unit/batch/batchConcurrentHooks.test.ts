/**
 * batchConcurrent Hooks Tests
 *
 * Asserts that every BatchHooksInterface callback fires at the correct stage,
 * the correct number of times, and with correct arguments for both process()
 * and processSettled().
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { BatchHooksInterface, BatchStatsType } from '../../../src/interfaces/index.js';
import { batchConcurrent } from '../../../src/batch/index.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function buildRecorder<TResult = number>(): {
  'batchStartTotal': number[];
  'completions': BatchStatsType[];
  'hooks': BatchHooksInterface<TResult>;
  'itemErrors': { 'error': unknown; 'index': number }[];
  'itemSettled': number[];
  'itemStarts': number[];
  'itemSuccesses': { 'index': number; 'result': TResult }[];
  'saturations': number;
} {
  const batchStartTotal: number[] = [];
  const itemStarts: number[] = [];
  const itemSuccesses: { 'index': number; 'result': TResult }[] = [];
  const itemErrors: { 'error': unknown; 'index': number }[] = [];
  const itemSettled: number[] = [];
  let saturations = 0;
  const completions: BatchStatsType[] = [];

  const hooks: BatchHooksInterface<TResult> = {
    'onBatchComplete': (stats) => { completions.push(stats); },
    'onBatchStart': (total) => { batchStartTotal.push(total); },
    'onConcurrencySaturated': () => { saturations++; },
    'onItemError': (index, error) => { itemErrors.push({ 'error': error, 'index': index }); },
    'onItemSettled': (index) => { itemSettled.push(index); },
    'onItemStart': (index) => { itemStarts.push(index); },
    'onItemSuccess': (index, result) => { itemSuccesses.push({ 'index': index, 'result': result }); },
  };

  return {
    'batchStartTotal': batchStartTotal,
    'completions': completions,
    'hooks': hooks,
    'itemErrors': itemErrors,
    'itemSettled': itemSettled,
    'itemStarts': itemStarts,
    'itemSuccesses': itemSuccesses,
    get saturations() { return saturations; },
  };
}

// ── process() hooks ───────────────────────────────────────────────────────────

it('process hooks: onBatchStart fires once with total item count', async () => {
  const rec = buildRecorder<number>();
  const items = [10, 20, 30, 40, 50];

  for await (const _ of batchConcurrent.process(
    items,
    async (n) => { return n; },
    { 'hooks': rec.hooks, 'maxConcurrent': 2 }
  )) { /* consume */ }

  assert.strictEqual(rec.batchStartTotal.length, 1);
  assert.strictEqual(rec.batchStartTotal[0], 5);
});

it('process hooks: onItemStart fires once per item in global-index order', async () => {
  const rec = buildRecorder<number>();
  const items = [1, 2, 3, 4];

  for await (const _ of batchConcurrent.process(
    items,
    async (n) => { return n; },
    { 'hooks': rec.hooks, 'maxConcurrent': 2 }
  )) { /* consume */ }

  assert.strictEqual(rec.itemStarts.length, 4);
  assert.deepStrictEqual(rec.itemStarts.slice().sort((a, b) => { return a - b; }), [0, 1, 2, 3]);
});

it('process hooks: onItemSuccess fires for every resolved item with correct index and result', async () => {
  const rec = buildRecorder<number>();
  const items = [10, 20, 30];

  for await (const _ of batchConcurrent.process(
    items,
    async (n) => { return n * 2; },
    { 'hooks': rec.hooks, 'maxConcurrent': 3 }
  )) { /* consume */ }

  assert.strictEqual(rec.itemSuccesses.length, 3);

  const sorted = rec.itemSuccesses.slice().sort((a, b) => { return a.index - b.index; });

  assert.deepStrictEqual(sorted[0], { 'index': 0, 'result': 20 });
  assert.deepStrictEqual(sorted[1], { 'index': 1, 'result': 40 });
  assert.deepStrictEqual(sorted[2], { 'index': 2, 'result': 60 });
});

it('process hooks: onItemError fires for a failing item before propagation', async () => {
  const rec = buildRecorder<number>();
  const items = [1, 2, 3];
  const boom = new Error('boom');

  const run = async (): Promise<void> => {
    for await (const _ of batchConcurrent.process(
      items,
      async (n) => {
        if (n === 2) { throw boom; }
        return n;
      },
      { 'hooks': rec.hooks, 'maxConcurrent': 3 }
    )) { /* consume */ }
  };

  await assert.rejects(run, /boom/u);

  assert.strictEqual(rec.itemErrors.length, 1);
  assert.strictEqual(rec.itemErrors[0]!.index, 1);
  assert.strictEqual(rec.itemErrors[0]!.error, boom);
});

it('process hooks: onItemSettled fires for every item, success and error', async () => {
  const rec = buildRecorder<number>();
  const items = [1, 2, 3];

  const run = async (): Promise<void> => {
    for await (const _ of batchConcurrent.process(
      items,
      async (n) => {
        if (n === 2) { throw new Error('oops'); }
        return n;
      },
      { 'hooks': rec.hooks, 'maxConcurrent': 3 }
    )) { /* consume */ }
  };

  await assert.rejects(run);

  // All 3 items settled (success, error, success) — Promise.all rejects after all settle
  assert.strictEqual(rec.itemSettled.length, 3);
  assert.deepStrictEqual(rec.itemSettled.slice().sort((a, b) => { return a - b; }), [0, 1, 2]);
});

it('process hooks: onItemSettled fires after onItemSuccess for resolved items', async () => {
  const order: string[] = [];
  const items = [42];

  const hooks: BatchHooksInterface<number> = {
    'onItemSettled': (index) => { order.push(`settled-${index}`); },
    'onItemSuccess': (index) => { order.push(`success-${index}`); },
  };

  for await (const _ of batchConcurrent.process(
    items,
    async (n) => { return n; },
    { 'hooks': hooks }
  )) { /* consume */ }

  assert.deepStrictEqual(order, ['success-0', 'settled-0']);
});

it('process hooks: onItemSettled fires after onItemError for rejected items', async () => {
  const order: string[] = [];
  const items = [1];

  const hooks: BatchHooksInterface<number> = {
    'onItemError': (index) => { order.push(`error-${index}`); },
    'onItemSettled': (index) => { order.push(`settled-${index}`); },
  };

  const run = async (): Promise<void> => {
    for await (const _ of batchConcurrent.process(
      items,
      async () => { throw new Error('fail'); },
      { 'hooks': hooks }
    )) { /* consume */ }
  };

  await assert.rejects(run);
  assert.deepStrictEqual(order, ['error-0', 'settled-0']);
});

it('process hooks: onConcurrencySaturated fires when batch fills concurrency window', async () => {
  const rec = buildRecorder<number>();
  // 5 items, concurrency 2 → batches [0,1], [2,3], [4]
  // saturated for first two batches (batch.length === maxConcurrent); last batch has 1 item, not saturated
  const items = [1, 2, 3, 4, 5];

  for await (const _ of batchConcurrent.process(
    items,
    async (n) => { return n; },
    { 'hooks': rec.hooks, 'maxConcurrent': 2 }
  )) { /* consume */ }

  assert.strictEqual(rec.saturations, 2);
});

it('process hooks: onBatchComplete fires once with correct stats (all success)', async () => {
  const rec = buildRecorder<number>();
  const items = [1, 2, 3, 4];

  for await (const _ of batchConcurrent.process(
    items,
    async (n) => { return n; },
    { 'hooks': rec.hooks, 'maxConcurrent': 4 }
  )) { /* consume */ }

  assert.strictEqual(rec.completions.length, 1);
  assert.deepStrictEqual(rec.completions[0], { 'failed': 0, 'succeeded': 4, 'total': 4 });
});

it('process hooks: onBatchComplete does not fire when an error aborts the run', async () => {
  // process() uses Promise.all — a rejection propagates immediately and the
  // generator terminates before onBatchComplete can be reached.
  const rec = buildRecorder<number>();
  const items = [1, 2, 3];

  const run = async (): Promise<void> => {
    for await (const _ of batchConcurrent.process(
      items,
      async (n) => {
        if (n === 1) { throw new Error('abort'); }
        return n;
      },
      { 'hooks': rec.hooks, 'maxConcurrent': 3 }
    )) { /* consume */ }
  };

  await assert.rejects(run, /abort/u);
  assert.strictEqual(rec.completions.length, 0);
});

it('process hooks: existing bare-number concurrency call remains unbroken', async () => {
  // Verify non-breaking: no hooks, plain number concurrency still works.
  const items = [1, 2, 3];
  const results: number[] = [];

  for await (const batch of batchConcurrent.process(items, async (n) => { return n * 10; }, 2)) {
    results.push(...batch);
  }

  assert.deepStrictEqual(results, [10, 20, 30]);
});

it('process hooks: existing plain-options (no hooks) call remains unbroken', async () => {
  const items = [1, 2];
  const results: number[] = [];

  for await (const batch of batchConcurrent.process(
    items,
    async (n) => { return n * 3; },
    { 'maxConcurrent': 2 }
  )) {
    results.push(...batch);
  }

  assert.deepStrictEqual(results, [3, 6]);
});

// ── processSettled() hooks ────────────────────────────────────────────────────

it('processSettled hooks: onBatchStart fires once with total item count', async () => {
  const rec = buildRecorder<number>();
  const items = [1, 2, 3];

  for await (const _ of batchConcurrent.processSettled(
    items,
    async (n) => { return n; },
    { 'hooks': rec.hooks, 'maxConcurrent': 3 }
  )) { /* consume */ }

  assert.strictEqual(rec.batchStartTotal.length, 1);
  assert.strictEqual(rec.batchStartTotal[0], 3);
});

it('processSettled hooks: onItemSuccess fires for resolved items, onItemError for rejected', async () => {
  const rec = buildRecorder<number>();
  const items = [1, 2, 3];

  for await (const _ of batchConcurrent.processSettled(
    items,
    async (n) => {
      if (n === 2) { throw new Error('partial fail'); }
      return n * 10;
    },
    { 'hooks': rec.hooks, 'maxConcurrent': 3 }
  )) { /* consume */ }

  assert.strictEqual(rec.itemSuccesses.length, 2);
  assert.strictEqual(rec.itemErrors.length, 1);
  assert.strictEqual(rec.itemErrors[0]!.index, 1);
});

it('processSettled hooks: onItemSettled fires for every item including failures', async () => {
  const rec = buildRecorder<number>();
  const items = [1, 2, 3, 4];

  for await (const _ of batchConcurrent.processSettled(
    items,
    async (n) => {
      if (n === 3) { throw new Error('fail'); }
      return n;
    },
    { 'hooks': rec.hooks, 'maxConcurrent': 4 }
  )) { /* consume */ }

  assert.strictEqual(rec.itemSettled.length, 4);
  assert.deepStrictEqual(rec.itemSettled.slice().sort((a, b) => { return a - b; }), [0, 1, 2, 3]);
});

it('processSettled hooks: onBatchComplete fires with correct failed count', async () => {
  const rec = buildRecorder<number>();
  const items = [1, 2, 3, 4, 5];

  for await (const _ of batchConcurrent.processSettled(
    items,
    async (n) => {
      if (n === 2 || n === 4) { throw new Error('fail'); }
      return n;
    },
    { 'hooks': rec.hooks, 'maxConcurrent': 5 }
  )) { /* consume */ }

  assert.strictEqual(rec.completions.length, 1);
  assert.deepStrictEqual(rec.completions[0], { 'failed': 2, 'succeeded': 3, 'total': 5 });
});

it('processSettled hooks: onConcurrencySaturated fires only for full batches', async () => {
  const rec = buildRecorder<number>();
  // 5 items, concurrency 2 → batches [0,1], [2,3], [4]
  // first two batches are full → 2 saturation events
  const items = [1, 2, 3, 4, 5];

  for await (const _ of batchConcurrent.processSettled(
    items,
    async (n) => { return n; },
    { 'hooks': rec.hooks, 'maxConcurrent': 2 }
  )) { /* consume */ }

  assert.strictEqual(rec.saturations, 2);
});

it('processSettled hooks: global indices span across batches correctly', async () => {
  const rec = buildRecorder<string>();
  const items = ['a', 'b', 'c', 'd'];

  for await (const _ of batchConcurrent.processSettled(
    items,
    async (s) => { return s.toUpperCase(); },
    { 'hooks': rec.hooks, 'maxConcurrent': 2 }
  )) { /* consume */ }

  // indices must be 0,1,2,3 across both batches
  const startsSorted = rec.itemStarts.slice().sort((a, b) => { return a - b; });

  assert.deepStrictEqual(startsSorted, [0, 1, 2, 3]);

  const settledSorted = rec.itemSettled.slice().sort((a, b) => { return a - b; });

  assert.deepStrictEqual(settledSorted, [0, 1, 2, 3]);

  const successSorted = rec.itemSuccesses.slice().sort((a, b) => { return a.index - b.index; });

  assert.deepStrictEqual(
    successSorted.map((e) => { return e.result; }),
    ['A', 'B', 'C', 'D']
  );
});

it('processSettled hooks: onBatchComplete fires even when all items fail', async () => {
  const rec = buildRecorder<number>();
  const items = [1, 2, 3];

  for await (const _ of batchConcurrent.processSettled(
    items,
    async () => { throw new Error('always fails'); },
    { 'hooks': rec.hooks, 'maxConcurrent': 3 }
  )) { /* consume */ }

  assert.strictEqual(rec.completions.length, 1);
  assert.deepStrictEqual(rec.completions[0], { 'failed': 3, 'succeeded': 0, 'total': 3 });
});

it('processSettled hooks: existing plain-number concurrency call remains unbroken', async () => {
  const items = [1, 2, 3];
  const settled: PromiseSettledResult<number>[] = [];

  for await (const batch of batchConcurrent.processSettled(items, async (n) => { return n; }, 2)) {
    settled.push(...batch);
  }

  assert.ok(settled.every((r) => { return r.status === 'fulfilled'; }));
});
