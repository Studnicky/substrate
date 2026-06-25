/** builder-circular-buffer — construct a CircularBuffer via the fluent builder API. Run: npx tsx packages/circular-buffer/examples/builder-circular-buffer.ts */
import assert from 'node:assert/strict';

import { CircularBuffer } from '../src/index.js';

// #region usage
// Build a capacity-3 ring in overwrite mode.
// On overflow, the oldest item is evicted.
const overwriteRing = CircularBuffer.builder<number>()
  .withCapacity(3)
  .withOverflow('overwrite')
  .build();

console.log('overwrite ring — initial length:', overwriteRing.length);

overwriteRing.push(1);
overwriteRing.push(2);
overwriteRing.push(3);
console.log('overwrite ring — after push(1,2,3), length:', overwriteRing.length);

overwriteRing.push(4); // evicts 1
console.log('overwrite ring — after push(4) (evicts 1), length:', overwriteRing.length);

const overwriteDrained: number[] = [];
let overwriteItem = overwriteRing.shift();
while (overwriteItem !== undefined) {
  overwriteDrained.push(overwriteItem);
  overwriteItem = overwriteRing.shift();
}
console.log('overwrite ring — drained:', overwriteDrained);

// Build a capacity-2 ring in grow mode.
// On overflow, capacity doubles instead of evicting items.
const growRing = CircularBuffer.builder<number>()
  .withCapacity(2)
  .withOverflow('grow')
  .build();

console.log('grow ring — initial length:', growRing.length);

growRing.push(10);
growRing.push(20);
growRing.push(30); // triggers grow: capacity doubles to 4, nothing evicted
console.log('grow ring — after push(10,20,30), length:', growRing.length);

const growDrained: number[] = [];
let growItem = growRing.shift();
while (growItem !== undefined) {
  growDrained.push(growItem);
  growItem = growRing.shift();
}
console.log('grow ring — drained:', growDrained);
// #endregion usage

assert.deepEqual(overwriteDrained, [2, 3, 4]);
assert.equal(growDrained.length, 3);
assert.deepEqual(growDrained, [10, 20, 30]);

console.log('builder-circular-buffer: all assertions passed');
