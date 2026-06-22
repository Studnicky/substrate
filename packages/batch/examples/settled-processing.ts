/**
 * Settled batch processing example.
 *
 * Demonstrates `batchConcurrent.processSettled` with partial-failure support.
 * One of the four input items rejects; the others fulfill normally. The
 * `processSettled` method uses `Promise.allSettled` internally so a single
 * rejection does not abort the batch or subsequent batches.
 *
 * The example also shows the custom "mapper" pattern: a typed arrow-const
 * mapper is defined and passed as the `operation` argument. This is the
 * primary extension seam for `batchConcurrent` — inject any typed async
 * function that matches `(item: T) => Promise<TResult>`.
 *
 * Run:
 *   npx tsx packages/batch/examples/settled-processing.ts
 */

import assert from 'node:assert/strict';
import { batchConcurrent } from '../src/index.js';

type Item = { id: number; shouldFail: boolean };
type Result = { id: number; value: string };

// Custom typed mapper — the extension seam for batchConcurrent.
const processItem = async (item: Item): Promise<Result> => {
  if (item.shouldFail) {
    throw new Error(`Item ${item.id} failed`);
  }
  return { id: item.id, value: `processed-${item.id}` };
};

const items: Item[] = [
  { id: 1, shouldFail: false },
  { id: 2, shouldFail: true },
  { id: 3, shouldFail: false },
  { id: 4, shouldFail: false },
];

const allSettled: PromiseSettledResult<Result>[] = [];

for await (const batch of batchConcurrent.processSettled(items, processItem, 2)) {
  console.log('Batch settled results:');
  for (const result of batch) {
    if (result.status === 'fulfilled') {
      console.log('  fulfilled:', result.value);
    } else {
      console.log('  rejected:', (result.reason as Error).message);
    }
  }
  allSettled.push(...batch);
}

// All 4 items must have been processed (fulfilled or rejected).
assert.equal(allSettled.length, 4, 'Expected 4 settled results');

const fulfilled = allSettled.filter((r): r is PromiseFulfilledResult<Result> => r.status === 'fulfilled');
const rejected = allSettled.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

assert.equal(fulfilled.length, 3, 'Expected 3 fulfilled results');
assert.equal(rejected.length, 1, 'Expected 1 rejected result');

// Verify fulfilled values.
const fulfilledValues = fulfilled.map((r) => r.value).sort((a, b) => a.id - b.id);
assert.deepEqual(fulfilledValues, [
  { id: 1, value: 'processed-1' },
  { id: 3, value: 'processed-3' },
  { id: 4, value: 'processed-4' },
]);

// Verify rejected reason.
assert.ok(rejected[0].reason instanceof Error);
assert.equal((rejected[0].reason as Error).message, 'Item 2 failed');

console.log('settled-processing: OK');
