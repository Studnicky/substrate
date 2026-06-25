/** builderMutex — constructs a Mutex via Mutex.builder()...build() and exercises key-based locking. Run: npx tsx examples/builderMutex.ts */

import assert from 'node:assert/strict';

// #region usage
import { Mutex } from '../src/index.js';

// Build a Mutex with a 5 000 ms acquisition timeout and a max queue depth of 50
const mutex = Mutex.builder<string>()
  .withTimeout(5_000)
  .withMaxQueueSize(50)
  .build();

console.log('Mutex built:', mutex.getStats());

// Different keys run concurrently — both complete without queuing
const order: string[] = [];
await Promise.all([
  mutex.runExclusive('orders', () => { order.push('orders'); }),
  mutex.runExclusive('payments', () => { order.push('payments'); })
]);
console.log('Parallel keys completed:', order.sort());

// Same key serializes — counter increments are race-free
let counter = 0;
await Promise.all([
  mutex.runExclusive('account', () => { counter += 1; }),
  mutex.runExclusive('account', () => { counter += 1; }),
  mutex.runExclusive('account', () => { counter += 1; })
]);
console.log('Serialized counter:', counter);

const stats = mutex.getStats();
console.log('Final stats:', stats);
// #endregion usage

assert.equal(order.length, 2, 'Both parallel keys completed');
assert.equal(counter, 3, 'Three serial increments without data race');
assert.equal(stats.activeLocksCount, 0, 'No active locks after all operations');

console.log('builderMutex: all assertions passed');
