/** builder-throttle — construct a Throttle via the fluent builder API. Run: npx tsx packages/throttle/examples/builder-throttle.ts */
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import { Throttle } from '../src/index.js';

// #region usage
// Build a Throttle with a concurrency limit of 3 via the fluent builder.
const throttle = Throttle.builder()
  .withConcurrencyLimit(3)
  .build();

console.log('throttle built via builder:', throttle);

// Submit 6 operations through the throttle; each awaits a tick then returns its index.
const promises: Promise<number | undefined>[] = [];
for (let i = 0; i < 6; i += 1) {
  const result = throttle.execute<number>(async () => {
    await setTimeout(1);
    return i;
  });
  promises.push(result);
}

const results = await Promise.all(promises);

console.log('results:', results);
console.log('stats:', throttle.getStats());
// #endregion usage

assert.equal(results.length, 6, 'results length must be 6');
for (let i = 0; i < 6; i++) {
  assert.equal(results[i], i, `result[${i}] must equal ${i}`);
}
assert.equal(throttle.getStats().concurrencyLimit, 3, 'concurrencyLimit must be 3');
assert.equal(throttle.getStats().totalExecuted, 6, 'totalExecuted must be 6');
assert.equal(throttle.getStats().activeCount, 0, 'activeCount must be 0');
assert.equal(throttle.getStats().queuedCount, 0, 'queuedCount must be 0');

console.log('builder-throttle: all assertions passed');
