/** basicUsage — fixed-capacity buffer: push, percentile, eviction, clear. Run: npx tsx examples/basicUsage.ts */

import assert from 'node:assert/strict';

// #region usage
import { SampleBuffer } from '../src/index.js';

const buffer = new SampleBuffer(5);

// Fill to capacity
buffer.push(10);
buffer.push(20);
buffer.push(30);
buffer.push(40);
buffer.push(50);

console.log('length:', buffer.length);   // 5
console.log('isFull:', buffer.isFull);   // true

// Percentile on a full buffer
const median = buffer.percentile(50);
const p95 = buffer.percentile(95);

console.log('p50:', median);
console.log('p95:', p95);

// Push beyond capacity — oldest samples are evicted
buffer.push(60); // evicts 10
buffer.push(70); // evicts 20

console.log('length after overflow:', buffer.length); // still 5

// Clear
buffer.clear();
console.log('length after clear:', buffer.length); // 0
// #endregion usage

assert.equal(buffer.length, 0);
assert.equal(new SampleBuffer(5).length, 0);

const full = new SampleBuffer(5);
full.push(10); full.push(20); full.push(30); full.push(40); full.push(50);
assert.equal(full.length, 5);
assert.equal(full.isFull, true);

const m = full.percentile(50);
assert.notEqual(m, undefined);
assert.ok(m! >= 10 && m! <= 50, `Expected median between 10 and 50, got ${m}`);

const p = full.percentile(95);
assert.notEqual(p, undefined);

full.push(60); full.push(70);
assert.equal(full.length, 5);

console.log('basicUsage: all assertions passed');
