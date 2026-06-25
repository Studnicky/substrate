/** builder-sample-buffer — construct a SampleBuffer via the fluent builder API. Run: npx tsx packages/sample-buffer/examples/builder-sample-buffer.ts */
import assert from 'node:assert/strict';

import { SampleBuffer } from '../src/index.js';

// #region usage
// Build a SampleBuffer with capacity 5 via the fluent builder.
const buffer = SampleBuffer.builder().withCapacity(5).build();
console.log('builder construction: SampleBuffer.builder().withCapacity(5).build()');

// Push 5 samples to fill the buffer.
buffer.push(10);
buffer.push(20);
buffer.push(30);
buffer.push(40);
buffer.push(50);

console.log('length after 5 pushes:', buffer.length);
console.log('isFull after 5 pushes:', buffer.isFull);
console.log('percentile(50):', buffer.percentile(50));
console.log('percentile(95):', buffer.percentile(95));

// Push 2 more samples past capacity — oldest two (10, 20) are evicted; length stays 5.
buffer.push(60);
buffer.push(70);

console.log('length after 2 overflow pushes:', buffer.length);

// Clear the buffer — length resets to 0.
buffer.clear();
console.log('length after clear():', buffer.length);
// #endregion usage

assert.equal(buffer.length, 0);

// Re-build to test the post-fill assertions cleanly.
const buf2 = SampleBuffer.builder().withCapacity(5).build();
buf2.push(10);
buf2.push(20);
buf2.push(30);
buf2.push(40);
buf2.push(50);

assert.equal(buf2.length, 5);
assert.equal(buf2.isFull, true);

const p50 = buf2.percentile(50);
assert.notEqual(p50, undefined);
assert(p50 !== undefined && p50 >= 10 && p50 <= 50);

const p95 = buf2.percentile(95);
assert.notEqual(p95, undefined);

buf2.push(60);
buf2.push(70);
assert.equal(buf2.length, 5);

buf2.clear();
assert.equal(buf2.length, 0);

console.log('builder-sample-buffer: all assertions passed');
