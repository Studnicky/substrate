/**
 * Basic batch processing example.
 *
 * Demonstrates `batchConcurrent.process` by doubling five numbers
 * with a concurrency of 2. Results are yielded batch-by-batch so each
 * batch is logged as it completes. All results are then flattened and
 * verified with strict assertions.
 *
 * Run:
 *   npx tsx packages/batch/examples/basic-processing.ts
 */

import assert from 'node:assert/strict';
import { batchConcurrent } from '../src/index.js';

const items = [1, 2, 3, 4, 5] as const;

const double = async (n: number): Promise<number> => n * 2;

const allResults: number[] = [];
let batchIndex = 0;

for await (const batch of batchConcurrent.process(items, double, 2)) {
  console.log(`Batch ${batchIndex}:`, batch);
  allResults.push(...batch);
  batchIndex++;
}

// All 5 items must have been processed.
assert.equal(allResults.length, 5, 'Expected 5 results');

// Results must match expected doubled values (order preserved within each batch).
const expected = [2, 4, 6, 8, 10];
assert.deepEqual(allResults.sort((a, b) => a - b), expected);

console.log('All results:', allResults);
console.log('basic-processing: OK');
