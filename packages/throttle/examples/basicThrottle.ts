/** basicThrottle — submit 6 operations through a concurrencyLimit-3 throttle and verify all complete. Run: npx tsx examples/basicThrottle.ts */

import assert from 'node:assert/strict';

import { Throttle } from '../src/index.js';

const throttle = new Throttle({ concurrencyLimit: 3 });

const results = await Promise.all(
  [0, 1, 2, 3, 4, 5].map((i) =>
    throttle.execute(async () => Promise.resolve(i))
  )
);

// All 6 resolved (execute returns T | undefined; none aborted so all have values)
assert.equal(results.length, 6, 'Expected 6 results');
for (const [index, result] of results.entries()) {
  assert.notEqual(result, undefined, `Result at index ${index} should not be undefined`);
  assert.equal(result, index, `Expected result ${index}`);
}

const stats = throttle.getStats();
assert.equal(stats.totalExecuted, 6, 'Expected 6 total executed');
assert.equal(stats.activeCount, 0, 'Expected 0 active');
assert.equal(stats.queuedCount, 0, 'Expected 0 queued');
assert.equal(stats.concurrencyLimit, 3, 'Expected concurrencyLimit 3');

console.log('basicThrottle stats:', stats);
console.log('results:', results);
