/** subclassHooks — override onGrow, onPush, and onShift to observe lifecycle events. Run: npx tsx examples/subclassHooks.ts */

import assert from 'node:assert/strict';

// #region usage
import { CircularBuffer } from '../src/index.js';

class GrowTracker<T> extends CircularBuffer<T> {
  readonly growEvents: number[] = [];

  protected override onGrow(_old: number, newCap: number): void {
    this.growEvents.push(newCap);
  }
}

const tracker = new GrowTracker<string>(2);

tracker.push('a');
tracker.push('b');
tracker.push('c'); // triggers grow: capacity 2 → 4

console.log(`grow events: ${tracker.growEvents.length}`);
console.log(`new capacity after grow: ${tracker.growEvents[0]}`);
// #endregion usage

assert.equal(tracker.growEvents.length, 1, 'expected exactly one grow event');
assert.equal(tracker.growEvents[0], 4, 'expected new capacity of 4');

console.log('subclassHooks: all assertions passed');
