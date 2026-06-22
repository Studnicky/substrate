// Run: npx tsx packages/sample-buffer/examples/subclassHooks.ts

import assert from 'node:assert/strict';
import { SampleBuffer } from '../src/index.js';

class EvictionLog extends SampleBuffer {
  readonly evicted: number[] = [];

  protected override onEvict(oldValue: number): void {
    this.evicted.push(oldValue);
  }
}

const log = new EvictionLog(3);

// First three fill the buffer — no evictions
log.push(1);
log.push(2);
log.push(3);

// Next two each trigger an eviction
log.push(4); // evicts 1
log.push(5); // evicts 2

assert.equal(log.evicted.length, 2);
assert.equal(log.evicted[0], 1);
assert.equal(log.evicted[1], 2);

console.log('subclassHooks: all assertions passed. evicted =', log.evicted);
