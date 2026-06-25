/**
 * Subclass extension tests for CircularBuffer
 *
 * Verifies that the protected seams (fields + hooks) are reachable and
 * overridable by a consumer subclass.
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';

// ── Test subclasses ───────────────────────────────────────────────────────────

class GrowLogBuffer<T> extends CircularBuffer<T> {
  readonly growLog: Array<{ oldCapacity: number; newCapacity: number }> = [];

  override onGrow(oldCapacity: number, newCapacity: number): void {
    this.growLog.push({ oldCapacity, newCapacity });
  }
}

class EvictLogBuffer<T> extends CircularBuffer<T> {
  readonly evictLog: T[] = [];

  override onEvict(item: T): void {
    this.evictLog.push(item);
  }
}

class PushCountBuffer<T> extends CircularBuffer<T> {
  pushCount = 0;

  override onPush(_item: T): void {
    this.pushCount++;
  }
}

class ShiftLogBuffer<T> extends CircularBuffer<T> {
  readonly shiftLog: T[] = [];

  override onShift(item: T): void {
    this.shiftLog.push(item);
  }
}

class OverflowEvictOrderBuffer<T> extends CircularBuffer<T> {
  readonly overflowLog: T[] = [];
  readonly evictLog: T[] = [];
  readonly eventLog: Array<{ 'event': string; 'item': T }> = [];

  override onOverflow(item: T): void {
    this.overflowLog.push(item);
    this.eventLog.push({ 'event': 'overflow', 'item': item });
  }

  override onEvict(item: T): void {
    this.evictLog.push(item);
    this.eventLog.push({ 'event': 'evict', 'item': item });
  }
}

class FullTraceBuffer<T> extends CircularBuffer<T> {
  readonly evictItems: T[] = [];
  readonly growEvents: number[] = [];
  readonly pushItems: T[] = [];
  readonly shiftItems: T[] = [];

  override onEvict(item: T): void {
    this.evictItems.push(item);
  }

  override onGrow(_oldCapacity: number, newCapacity: number): void {
    this.growEvents.push(newCapacity);
  }

  override onPush(item: T): void {
    this.pushItems.push(item);
  }

  override onShift(item: T): void {
    this.shiftItems.push(item);
  }
}

// ── onEvict scenarios ─────────────────────────────────────────────────────────

it('onEvict is called with the evicted item when overwrite triggers', () => {
  const buf = EvictLogBuffer.create<number>({ 'capacity': 2 });
  buf.push(1);
  buf.push(2);
  buf.push(3); // evicts 1
  assert.deepStrictEqual(buf.evictLog, [1]);
});

it('onEvict receives items in FIFO eviction order', () => {
  const buf = EvictLogBuffer.create<number>({ 'capacity': 2 });
  buf.push(1);
  buf.push(2);
  buf.push(3); // evicts 1
  buf.push(4); // evicts 2
  assert.deepStrictEqual(buf.evictLog, [1, 2]);
});

it('onEvict is not called when buffer is below capacity', () => {
  const buf = EvictLogBuffer.create<number>({ 'capacity': 4 });
  buf.push(1);
  buf.push(2);
  assert.strictEqual(buf.evictLog.length, 0);
});

it('onEvict receives exactly the oldest item (first in, first evicted)', () => {
  const buf = EvictLogBuffer.create<string>({ 'capacity': 3 });
  buf.push('a');
  buf.push('b');
  buf.push('c');
  buf.push('d'); // evicts 'a'
  assert.strictEqual(buf.evictLog[0], 'a');
  assert.strictEqual(buf.evictLog.length, 1);
});

// ── onGrow scenarios (grow mode only) ─────────────────────────────────────────

const onGrowScenarios: Array<{ description: string; capacity: number; items: number[]; expectedGrowCount: number }> = [
  {
    description: 'onGrow is called when capacity is exceeded in grow mode',
    capacity: 2,
    items: [1, 2, 3],
    expectedGrowCount: 1,
  },
  {
    description: 'onGrow is called once per grow event (two grows for 5 items in capacity 2)',
    capacity: 2,
    items: [0, 1, 2, 3, 4],
    expectedGrowCount: 2,
  },
];

for (const { description, capacity, items, expectedGrowCount } of onGrowScenarios) {
  it(description, () => {
    const buf = GrowLogBuffer.create<number>({ 'capacity': capacity, 'overflow': 'grow' });
    for (const item of items) buf.push(item);
    assert.strictEqual(buf.growLog.length, expectedGrowCount);
  });
}

it('onGrow is not called in overwrite mode', () => {
  const buf = GrowLogBuffer.create<number>({ 'capacity': 2 });
  buf.push(1);
  buf.push(2);
  buf.push(3); // overwrite, no grow
  assert.strictEqual(buf.growLog.length, 0);
});

// ── onPush scenarios ──────────────────────────────────────────────────────────

const onPushScenarios: Array<{ description: string; capacity: number; items: number[]; expectedPushCount: number; overflow?: 'grow' | 'overwrite' }> = [
  {
    description: 'onPush is called on each push (3 pushes, no overflow)',
    capacity: 8,
    items: [1, 2, 3],
    expectedPushCount: 3,
  },
  {
    description: 'onPush is called on push that triggers grow (grow mode)',
    capacity: 2,
    items: [1, 2, 3],
    expectedPushCount: 3,
    overflow: 'grow',
  },
  {
    description: 'onPush is called on each overwrite push (overwrite mode)',
    capacity: 2,
    items: [1, 2, 3],
    expectedPushCount: 3,
  },
];

for (const { description, capacity, items, expectedPushCount, overflow } of onPushScenarios) {
  it(description, () => {
    const buf = overflow !== undefined
      ? PushCountBuffer.create<number>({ 'capacity': capacity, 'overflow': overflow })
      : PushCountBuffer.create<number>({ 'capacity': capacity });
    for (const item of items) buf.push(item);
    assert.strictEqual(buf.pushCount, expectedPushCount);
  });
}

// ── onShift scenarios ─────────────────────────────────────────────────────────

const onShiftScenarios: Array<{
  description: string;
  capacity: number;
  pushItems: number[];
  shiftCount: number;
  expectedShiftLog: number[];
}> = [
  {
    description: 'onShift is called with the items before they are returned',
    capacity: 4,
    pushItems: [10, 20],
    shiftCount: 2,
    expectedShiftLog: [10, 20],
  },
  {
    description: 'onShift is not called when buffer is empty',
    capacity: 4,
    pushItems: [],
    shiftCount: 1,
    expectedShiftLog: [],
  },
  {
    description: 'onShift receives the correct item value',
    capacity: 4,
    pushItems: [42],
    shiftCount: 1,
    expectedShiftLog: [42],
  },
];

for (const { description, capacity, pushItems, shiftCount, expectedShiftLog } of onShiftScenarios) {
  it(description, () => {
    const buf = ShiftLogBuffer.create<number>({ 'capacity': capacity });
    for (const item of pushItems) buf.push(item);
    for (let i = 0; i < shiftCount; i++) buf.shift();
    assert.deepStrictEqual(buf.shiftLog, expectedShiftLog);
  });
}

// ── Flat it() blocks: complex inline subclass or multi-step logic ─────────────

it('onPush is called after push (length is already incremented)', () => {
  let lengthAtHook = -1;

  class LengthCheckBuffer extends CircularBuffer<number> {
    override onPush(_item: number): void {
      lengthAtHook = this._length;
    }
  }

  const buf = LengthCheckBuffer.create<number>({ 'capacity': 8 });
  buf.push(42);

  assert.strictEqual(lengthAtHook, 1);
});

it('onGrow receives correct old and new capacity (grow mode)', () => {
  const buf = GrowLogBuffer.create<number>({ 'capacity': 4, 'overflow': 'grow' });
  buf.push(1);
  buf.push(2);
  buf.push(3);
  buf.push(4);
  buf.push(5); // triggers grow from 4 → 8

  const [entry] = buf.growLog;
  assert.ok(entry !== undefined);
  assert.strictEqual(entry.oldCapacity, 4);
  assert.strictEqual(entry.newCapacity, 8);
});

it('grow mode: base class still operates correctly after grow', () => {
  const buf = GrowLogBuffer.create<number>({ 'capacity': 2, 'overflow': 'grow' });
  buf.push(1);
  buf.push(2);
  buf.push(3); // triggers grow

  assert.strictEqual(buf.length, 3);
  assert.strictEqual(buf.shift(), 1);
  assert.strictEqual(buf.shift(), 2);
  assert.strictEqual(buf.shift(), 3);
});

it('onShift received value matches shift return value', () => {
  const buf = ShiftLogBuffer.create<string>({ 'capacity': 4 });
  buf.push('hello');
  const returned = buf.shift();

  assert.strictEqual(returned, 'hello');
  assert.deepStrictEqual(buf.shiftLog, ['hello']);
});

it('FullTraceBuffer tracks evict, grow, push, and shift events independently (grow mode)', () => {
  const buf = FullTraceBuffer.create<number>({ 'capacity': 2, 'overflow': 'grow' });
  buf.push(1);
  buf.push(2);
  buf.push(3); // triggers grow
  buf.shift();
  buf.shift();

  assert.strictEqual(buf.growEvents.length, 1);
  assert.strictEqual(buf.pushItems.length, 3);
  assert.strictEqual(buf.shiftItems.length, 2);
  assert.strictEqual(buf.evictItems.length, 0); // grow mode never evicts
});

it('FullTraceBuffer tracks evict events in overwrite mode', () => {
  const buf = FullTraceBuffer.create<number>({ 'capacity': 2 });
  buf.push(1);
  buf.push(2);
  buf.push(3); // evicts 1
  buf.push(4); // evicts 2

  assert.strictEqual(buf.evictItems.length, 2);
  assert.deepStrictEqual(buf.evictItems, [1, 2]);
  assert.strictEqual(buf.growEvents.length, 0);
  assert.strictEqual(buf.pushItems.length, 4);
});

it('grow mode: buffer produces correct FIFO order with all hooks active', () => {
  const buf = FullTraceBuffer.create<number>({ 'capacity': 2, 'overflow': 'grow' });
  const values = [10, 20, 30, 40, 50];
  for (const v of values) buf.push(v);

  const result: number[] = [];
  while (buf.length > 0) {
    const v = buf.shift();
    if (v !== undefined) result.push(v);
  }

  assert.deepStrictEqual(result, values);
});

it('subclass can read _length, _head, _tail, _capacity, _items', () => {
  class InspectBuffer<T> extends CircularBuffer<T> {
    inspect(): { length: number; head: number; tail: number; capacity: number } {
      return {
        capacity: this._capacity,
        head: this._head,
        length: this._length,
        tail: this._tail,
      };
    }
  }

  const buf = InspectBuffer.create<number>({ 'capacity': 4 });
  buf.push(1);
  buf.push(2);
  buf.shift();

  const state = buf.inspect();
  assert.strictEqual(state.length, 1);
  assert.strictEqual(state.capacity, 4);
});

// ── onOverflow scenarios ──────────────────────────────────────────────────────

it('onOverflow is called with the incoming item when buffer is full (overwrite mode)', () => {
  const buf = OverflowEvictOrderBuffer.create<number>({ 'capacity': 2 });
  buf.push(1);
  buf.push(2);
  buf.push(3); // overflow: incoming=3, evicts 1
  assert.deepStrictEqual(buf.overflowLog, [3]);
});

it('onOverflow is not called when buffer is below capacity', () => {
  const buf = OverflowEvictOrderBuffer.create<number>({ 'capacity': 4 });
  buf.push(1);
  buf.push(2);
  assert.strictEqual(buf.overflowLog.length, 0);
});

it('onOverflow is not called in grow mode', () => {
  const buf = OverflowEvictOrderBuffer.create<number>({ 'capacity': 2, 'overflow': 'grow' });
  buf.push(1);
  buf.push(2);
  buf.push(3); // triggers grow, not overflow
  assert.strictEqual(buf.overflowLog.length, 0);
});

it('onOverflow fires before onEvict: incoming item logged before outgoing item', () => {
  const buf = OverflowEvictOrderBuffer.create<number>({ 'capacity': 2 });
  buf.push(1);
  buf.push(2);
  buf.push(3); // overflow incoming=3, evicts 1

  assert.deepStrictEqual(buf.overflowLog, [3]);
  assert.deepStrictEqual(buf.evictLog, [1]);

  // Verify sequence: overflow fires before evict
  assert.strictEqual(buf.eventLog[0]?.event, 'overflow');
  assert.strictEqual(buf.eventLog[0]?.item, 3);
  assert.strictEqual(buf.eventLog[1]?.event, 'evict');
  assert.strictEqual(buf.eventLog[1]?.item, 1);
});

it('onOverflow fires on every overwrite push (multiple overflows)', () => {
  const buf = OverflowEvictOrderBuffer.create<number>({ 'capacity': 2 });
  buf.push(1);
  buf.push(2);
  buf.push(3); // overflow
  buf.push(4); // overflow
  buf.push(5); // overflow
  assert.deepStrictEqual(buf.overflowLog, [3, 4, 5]);
});
