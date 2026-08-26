/** basicUsage — push items into a fixed-capacity ring buffer and observe overwrite eviction. Run: npx tsx examples/basicUsage.ts */

import assert from 'node:assert/strict';

// #region usage
import { CircularBuffer } from '../src/index.js';

// Fixed-capacity ring: capacity 3, overflow defaults to 'overwrite'
const buffer = CircularBuffer.create<number>({ 'capacity': 3 });

buffer.push(1);
buffer.push(2);
buffer.push(3);
buffer.push(4); // buffer is full — 1 is evicted, ring holds [2, 3, 4]

console.log(`length after 4 pushes into capacity-3 ring: ${buffer.length}`);
console.log(`shift: ${buffer.shift()}`); // 2 — oldest surviving item
console.log(`shift: ${buffer.shift()}`); // 3
console.log(`shift: ${buffer.shift()}`); // 4
console.log(`length after drain: ${buffer.length}`);
// #endregion usage

assert.equal(buffer.length, 0, 'length should be 0 after draining');

// Verify overwrite eviction explicitly
const ring = CircularBuffer.create<number>({ 'capacity': 3 });
ring.push(1);
ring.push(2);
ring.push(3);
ring.push(4); // evicts 1

const drained: number[] = [];
while (ring.length > 0) {
  const v = ring.shift();
  if (v !== undefined) {drained.push(v);}
}

assert.deepEqual(drained, [2, 3, 4], 'ring holds the three most recent items');

console.log('basicUsage: all assertions passed');
