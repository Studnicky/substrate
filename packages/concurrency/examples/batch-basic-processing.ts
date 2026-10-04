/** basic-processing — double five numbers with concurrency 2, batch by batch. Run: npx tsx examples/batch-basic-processing.ts */

import assert from 'node:assert/strict';

// #region usage
import { Batch } from '../src/index.js';

class NumberItem {
  static double(n: number): Promise<number> {
    const doubled = n * 2;
    const result = Promise.resolve(doubled);
    return result;
  }
}

const allResults: number[] = [];
let batchIndex = 0;

for await (const batch of Batch.create<number>(2).process([1, 2, 3, 4, 5], NumberItem.double)) {
  console.log('Batch', batchIndex, ':', batch);
  allResults.push(...batch);
  batchIndex++;
}

console.log('All results:', allResults);
// #endregion usage

// All 5 items must have been processed.
assert.equal(allResults.length, 5, 'Expected 5 results');

// Results must match expected doubled values (order preserved within each batch).
const sortedResults = allResults.toSorted((a, b) => { const result = a - b; return result; });
assert.deepEqual(sortedResults, [2, 4, 6, 8, 10]);

console.log('basic-processing: all assertions passed');
