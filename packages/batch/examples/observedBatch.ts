/** observedBatch — trace batch progress via the hooks option. Run: npx tsx examples/observedBatch.ts */

import assert from 'node:assert/strict';

// #region usage
import { batchConcurrent, type BatchHooksInterface, type BatchStatsType } from '../src/index.js';

// Items to process: ids 1–5. Item 3 always rejects to exercise error hooks.
type Task = { 'id': number; 'label': string };

const tasks: Task[] = [
  { 'id': 1, 'label': 'alpha' },
  { 'id': 2, 'label': 'beta' },
  { 'id': 3, 'label': 'gamma' },
  { 'id': 4, 'label': 'delta' },
  { 'id': 5, 'label': 'epsilon' }
];

// Captured events for post-run assertions
const capturedItemStarts: number[] = [];
const capturedSuccesses: { 'index': number; 'value': string }[] = [];
const capturedErrors: { 'index': number; 'message': string }[] = [];
const capturedSettled: number[] = [];
let capturedSaturations = 0;
let capturedStats: BatchStatsType | undefined;

const hooks: BatchHooksInterface<string> = {
  'onBatchComplete': (stats) => {
    console.log(`[batch] complete — total=${stats.total} succeeded=${stats.succeeded} failed=${stats.failed}`);
    capturedStats = stats;
  },
  'onBatchStart': (total) => {
    console.log(`[batch] start — ${total} items`);
  },
  'onConcurrencySaturated': () => {
    console.log('[batch] concurrency saturated — all slots in use');
    capturedSaturations++;
  },
  'onItemError': (index, error) => {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`[batch] item[${index}] error — ${msg}`);
    capturedErrors.push({ 'index': index, 'message': msg });
  },
  'onItemSettled': (index) => {
    console.log(`[batch] item[${index}] settled`);
    capturedSettled.push(index);
  },
  'onItemStart': (index) => {
    console.log(`[batch] item[${index}] start`);
    capturedItemStarts.push(index);
  },
  'onItemSuccess': (index, result) => {
    console.log(`[batch] item[${index}] success → ${result}`);
    capturedSuccesses.push({ 'index': index, 'value': result });
  }
};

const allSettled: PromiseSettledResult<string>[] = [];

for await (const batchResults of batchConcurrent.processSettled(
  tasks,
  (task) => {
    if (task.id === 3) {
      return Promise.reject(new Error(`task ${task.id} (${task.label}) failed`));
    }
    return Promise.resolve(`processed-${task.label}`);
  },
  { 'hooks': hooks, 'maxConcurrent': 2 }
)) {
  allSettled.push(...batchResults);
}
// #endregion usage

// ── post-run assertions ───────────────────────────────────────────────────────

// onItemStart fired for all 5 items; indices cover 0–4
assert.strictEqual(capturedItemStarts.length, 5, 'onItemStart must fire for every item');
assert.deepStrictEqual(
  capturedItemStarts.slice().sort((a, b) => { return a - b; }),
  [0, 1, 2, 3, 4]
);

// onItemSuccess: 4 items succeed (ids 1,2,4,5 → indices 0,1,3,4)
assert.strictEqual(capturedSuccesses.length, 4, 'onItemSuccess must fire for 4 successes');

const successIndices: number[] = [];
for (const e of capturedSuccesses) {
  successIndices.push(e.index);
}
successIndices.sort((a, b) => { return a - b; });

assert.deepStrictEqual(successIndices, [0, 1, 3, 4]);

// onItemError: 1 item fails (index 2)
assert.strictEqual(capturedErrors.length, 1, 'onItemError must fire exactly once');
assert.strictEqual(capturedErrors[0]!.index, 2);
assert.ok(capturedErrors[0]!.message.includes('gamma'));

// onItemSettled: fires for all 5 items
assert.strictEqual(capturedSettled.length, 5, 'onItemSettled must fire for every item');

// onConcurrencySaturated: 2 full batches of 2 out of batches [0,1],[2,3],[4]
assert.strictEqual(capturedSaturations, 2, 'onConcurrencySaturated must fire for each full batch');

// onBatchComplete: once, after processSettled finishes all batches
assert.ok(capturedStats !== undefined, 'onBatchComplete must fire');
assert.deepStrictEqual(capturedStats, { 'failed': 1, 'succeeded': 4, 'total': 5 });

// processSettled produces 5 settled results
assert.strictEqual(allSettled.length, 5);

console.log('observedBatch: all assertions passed');
