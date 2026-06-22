// Run: npx tsx packages/circular-buffer/examples/basicUsage.ts
import assert from 'node:assert/strict';
import { CircularBuffer } from '../src/index.js';

const buf = new CircularBuffer<number>(3);

buf.push(1);
buf.push(2);
buf.push(3);
buf.push(4); // capacity doubles to 6; all items retained

assert.equal(buf.length, 4, 'length should be 4 after pushing past initial capacity');

// Drain in FIFO order
assert.equal(buf.shift(), 1);
assert.equal(buf.shift(), 2);
assert.equal(buf.shift(), 3);
assert.equal(buf.shift(), 4);

assert.equal(buf.length, 0, 'length should be 0 after draining');

console.log('basicUsage: 4 items pushed (grow triggered), shifted in FIFO order, buffer drained — all assertions passed');
