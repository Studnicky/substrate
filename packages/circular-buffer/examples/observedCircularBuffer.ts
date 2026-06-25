/** observedCircularBuffer — trace all lifecycle hooks via console.log. Run: npx tsx examples/observedCircularBuffer.ts */

import assert from 'node:assert/strict';

// #region usage
import { CircularBuffer } from '../src/index.js';

class TracingBuffer<T> extends CircularBuffer<T> {
  readonly overflowItems: T[] = [];
  readonly evictItems: T[] = [];
  readonly growEvents: { 'newCapacity': number; 'oldCapacity': number }[] = [];
  readonly pushItems: T[] = [];
  readonly shiftItems: T[] = [];

  protected override onOverflow(item: T): void {
    console.log(`[circular-buffer] overflow incoming=${String(item)}`);
    this.overflowItems.push(item);
  }

  protected override onEvict(item: T): void {
    console.log(`[circular-buffer] evict item=${String(item)}`);
    this.evictItems.push(item);
  }

  protected override onGrow(oldCapacity: number, newCapacity: number): void {
    console.log(`[circular-buffer] grow ${oldCapacity} → ${newCapacity}`);
    this.growEvents.push({ 'newCapacity': newCapacity, 'oldCapacity': oldCapacity });
  }

  protected override onPush(item: T): void {
    console.log(`[circular-buffer] push item=${String(item)} length=${this.length}`);
    this.pushItems.push(item);
  }

  protected override onShift(item: T): void {
    console.log(`[circular-buffer] shift item=${String(item)} length=${this.length}`);
    this.shiftItems.push(item);
  }
}

// Scenario 1: capacity-3 overwrite buffer, push 5 items (2 overflows/evictions)
console.log('--- overwrite mode (capacity 3) ---');
const ring = TracingBuffer.create<number>({ 'capacity': 3 });
ring.push(1);
ring.push(2);
ring.push(3);
ring.push(4); // overflow: evicts 1
ring.push(5); // overflow: evicts 2

console.log('shifting all remaining items:');
while (ring.length > 0) { ring.shift(); }

// Scenario 2: capacity-2 grow-mode buffer
console.log('--- grow mode (capacity 2) ---');
const growing = TracingBuffer.create<number>({ 'capacity': 2, 'overflow': 'grow' });
growing.push(10);
growing.push(20);
growing.push(30); // triggers grow 2 → 4

console.log('observedCircularBuffer: scenarios complete');
// #endregion usage

// Assertions (outside the #region — these verify hook counts, not demo output)

// overwrite ring: 5 pushes total, 2 overflows, 2 evictions, 3 shifts
assert.strictEqual(ring.pushItems.length, 5);
assert.strictEqual(ring.overflowItems.length, 2);
assert.deepStrictEqual(ring.overflowItems, [4, 5]);
assert.strictEqual(ring.evictItems.length, 2);
assert.deepStrictEqual(ring.evictItems, [1, 2]);
assert.strictEqual(ring.shiftItems.length, 3);
assert.strictEqual(ring.growEvents.length, 0);

// grow buffer: 3 pushes, 1 grow event, no overflow, no evictions
assert.strictEqual(growing.pushItems.length, 3);
assert.strictEqual(growing.growEvents.length, 1);
assert.strictEqual(growing.growEvents[0]?.oldCapacity, 2);
assert.strictEqual(growing.growEvents[0]?.newCapacity, 4);
assert.strictEqual(growing.overflowItems.length, 0);
assert.strictEqual(growing.evictItems.length, 0);

console.log('observedCircularBuffer: all assertions passed');
