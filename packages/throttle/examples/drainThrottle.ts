/** drainThrottle — submit operations, call drain(), assert isComplete() is true after drain. Run: npx tsx examples/drainThrottle.ts */

import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import { Throttle } from '../src/index.js';

// #region usage

const throttle = Throttle.create({ 'concurrencyLimit': 5 });

// Submit 4 operations before draining
const pending = Promise.all(
  [1, 2, 3, 4].map((i) => {
    const result = throttle.execute(async () => {
      await setTimeout(1);
      return i * 10;
    });
    return result;
  })
);

// drain() stops accepting new work and waits for all queued/active ops to finish
await throttle.drain();

// All submitted operations should have resolved by now
const results = await pending;
const stats = throttle.getStats();

console.log('drainThrottle stats:', stats);
console.log('results:', results);
// #endregion usage

assert.equal(results.length, 4, 'Expected 4 results');
assert.ok(throttle.isComplete(), 'Throttle should be complete after drain');

assert.equal(stats.totalExecuted, 4, 'Expected 4 total executed');
assert.equal(stats.isDraining, false, 'isDraining should be false after drain completes to idle');
assert.equal(stats.activeCount, 0, 'Expected 0 active');

console.log('drainThrottle: all assertions passed');
