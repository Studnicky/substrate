/** subclassHooks — override onEvict, onPush, onShift, and onGrow to observe lifecycle events. Run: npx tsx examples/subclassHooks.ts */

import assert from 'node:assert/strict';

// #region usage
import { CircularBuffer } from '../src/index.js';

// Default overwrite ring — observe evictions
class EvictTracker<T> extends CircularBuffer<T> {
  readonly evictedItems: T[] = [];

  protected override onEvict(item: T): void {
    this.evictedItems.push(item);
  }
}

const ring = EvictTracker.create<string>({ 'capacity': 2 });

ring.push('a');
ring.push('b');
ring.push('c'); // 'a' is evicted

console.log(`evicted items: ${ring.evictedItems.join(', ')}`);
console.log(`ring length: ${ring.length}`);

// Opt-in grow mode — observe capacity changes
class GrowTracker<T> extends CircularBuffer<T> {
  readonly growEvents: number[] = [];

  protected override onGrow(_old: number, newCap: number): void {
    this.growEvents.push(newCap);
  }
}

const growing = GrowTracker.create<string>({ 'capacity': 2, 'overflow': 'grow' });

growing.push('a');
growing.push('b');
growing.push('c'); // triggers grow: capacity 2 → 4

console.log(`grow events: ${growing.growEvents.length}`);
console.log(`new capacity after grow: ${growing.growEvents[0]}`);
// #endregion usage

assert.deepEqual(ring.evictedItems, ['a'], 'expected "a" to be evicted');
assert.equal(ring.length, 2, 'ring holds exactly 2 items after overflow');

assert.equal(growing.growEvents.length, 1, 'expected exactly one grow event');
assert.equal(growing.growEvents[0], 4, 'expected new capacity of 4');

console.log('subclassHooks: all assertions passed');
