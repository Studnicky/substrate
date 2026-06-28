/** settled-processing — processSettled with partial-failure: one of four items rejects, others fulfill. Run: npx tsx examples/settled-processing.ts */

import assert from 'node:assert/strict';

// #region usage
import { Batch } from '../src/index.js';

type Item = { 'id': number; 'shouldFail': boolean };

// Custom typed mapper — the extension seam for Batch.
// Static method on the produced type is the canonical shape.
class Result {
  constructor(
    readonly id: number,
    readonly value: string
  ) {}

  static process(item: Item): Promise<Result> {
    if (item.shouldFail) {
      return Promise.reject(new Error(`Item ${item.id} failed`));
    }
    return Promise.resolve(new Result(item.id, `processed-${item.id}`));
  }
}

const items: Item[] = [
  { 'id': 1, 'shouldFail': false },
  { 'id': 2, 'shouldFail': true },
  { 'id': 3, 'shouldFail': false },
  { 'id': 4, 'shouldFail': false }
];

const allSettled: PromiseSettledResult<Result>[] = [];

for await (const batch of Batch.create<Result>(2).processSettled(items, Result.process)) {
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

console.log('Total settled:', allSettled.length);
// #endregion usage

// All 4 items must have been processed (fulfilled or rejected).
assert.equal(allSettled.length, 4, 'Expected 4 settled results');

const fulfilled = allSettled.filter((r): r is PromiseFulfilledResult<Result> => {return r.status === 'fulfilled';});
const rejected = allSettled.filter((r): r is PromiseRejectedResult => {return r.status === 'rejected';});

assert.equal(fulfilled.length, 3, 'Expected 3 fulfilled results');
assert.equal(rejected.length, 1, 'Expected 1 rejected result');

// Verify fulfilled values.
const fulfilledValues: Result[] = [];
for (const r of fulfilled) {
  fulfilledValues.push(r.value);
}
fulfilledValues.sort((a, b) => {return a.id - b.id;});
assert.deepEqual(fulfilledValues, [
  new Result(1, 'processed-1'),
  new Result(3, 'processed-3'),
  new Result(4, 'processed-4')
]);

// Verify rejected reason.
assert.ok(rejected[0]!.reason instanceof Error);
assert.equal(rejected[0]!.reason.message, 'Item 2 failed');

console.log('settled-processing: all assertions passed');
