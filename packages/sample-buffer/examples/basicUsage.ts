// Run: npx tsx packages/sample-buffer/examples/basicUsage.ts

import assert from 'node:assert/strict';
import { SampleBuffer } from '../src/index.js';

const buffer = new SampleBuffer(5);

// Fill to capacity
buffer.push(10);
buffer.push(20);
buffer.push(30);
buffer.push(40);
buffer.push(50);

assert.equal(buffer.length, 5);
assert.equal(buffer.isFull, true);

// Percentile on a full buffer
const median = buffer.percentile(50);
assert.notEqual(median, undefined);
assert.ok(median! >= 10 && median! <= 50, `Expected median between 10 and 50, got ${median}`);

const p95 = buffer.percentile(95);
assert.notEqual(p95, undefined);

// Push beyond capacity — oldest samples are evicted
buffer.push(60); // evicts 10
buffer.push(70); // evicts 20

assert.equal(buffer.length, 5);

// Clear
buffer.clear();
assert.equal(buffer.length, 0);

console.log('basicUsage: all assertions passed. p50 =', median, ', p95 =', p95);
