/** builder-throttle — construct a Throttle via the fluent builder API. Run: npx tsx packages/throttle/examples/builder-throttle.ts */
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import { Throttle } from '../src/index.js';
import { BuilderThrottleFixtures } from './fixtures/builderThrottleFixtures.js';

// #region usage
// Build a Throttle with a concurrency limit via the fluent builder.
const throttle = Throttle.builder()
  .withConcurrencyLimit(BuilderThrottleFixtures.concurrencyLimit)
  .build();

console.log('throttle built via builder:', throttle);

// Submit operations through the throttle; each awaits a tick then returns its index.
const results = await (async (): Promise<(number | undefined)[]> => {
  const promises: Promise<number | undefined>[] = [];
  for (let i = 0; i < BuilderThrottleFixtures.operationCount; i += 1) {
    const result = throttle.execute<number>(async () => {
      await setTimeout(BuilderThrottleFixtures.tickMs);
      return i;
    });
    promises.push(result);
  }
  return await Promise.all(promises);
})();

console.log('results:', results);
console.log('stats:', throttle.getStats());
// #endregion usage

assert.equal(results.length, BuilderThrottleFixtures.operationCount, 'results length must match operationCount');
for (let i = 0; i < BuilderThrottleFixtures.operationCount; i++) {
  assert.equal(results[i], i, `result[${i}] must equal ${i}`);
}
assert.equal(throttle.getStats().concurrencyLimit, BuilderThrottleFixtures.concurrencyLimit, 'concurrencyLimit must match fixture');
assert.equal(throttle.getStats().totalExecuted, BuilderThrottleFixtures.operationCount, 'totalExecuted must match operationCount');
assert.equal(throttle.getStats().activeCount, 0, 'activeCount must be 0');
assert.equal(throttle.getStats().queuedCount, 0, 'queuedCount must be 0');

console.log('builder-throttle: all assertions passed');
