/** drainThrottle — submit operations, call drain(), assert isComplete() is true after drain. Run: npx tsx examples/drainThrottle.ts */

import assert from 'node:assert/strict';

import { Throttle } from '../src/index.js';

const throttle = new Throttle({ concurrencyLimit: 5 });

// Submit 4 operations before draining
const pending = Promise.all(
  [1, 2, 3, 4].map((i) =>
    throttle.execute(async () => Promise.resolve(i * 10))
  )
);

// drain() stops accepting new work and waits for all queued/active ops to finish
await throttle.drain();

// All submitted operations should have resolved by now
const results = await pending;

assert.equal(results.length, 4, 'Expected 4 results');
assert.ok(throttle.isComplete(), 'Throttle should be complete after drain');

const stats = throttle.getStats();
assert.equal(stats.totalExecuted, 4, 'Expected 4 total executed');
assert.equal(stats.isDraining, false, 'isDraining should be false after drain completes to idle');
assert.equal(stats.activeCount, 0, 'Expected 0 active');

console.log('drainThrottle stats:', stats);
console.log('results:', results);
