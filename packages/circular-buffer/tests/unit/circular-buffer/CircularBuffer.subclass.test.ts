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

class FullTraceBuffer<T> extends CircularBuffer<T> {
  readonly growEvents: number[] = [];
  readonly pushItems: T[] = [];
  readonly shiftItems: T[] = [];

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

// ── onGrow scenarios ──────────────────────────────────────────────────────────

const onGrowScenarios: Array<{ description: string; capacity: number; items: number[]; expectedGrowCount: number }> = [
  {
    description: 'onGrow is called when capacity is exceeded',
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
    const buf = new GrowLogBuffer<number>(capacity);
    for (const item of items) buf.push(item);
    assert.strictEqual(buf.growLog.length, expectedGrowCount);
  });
}

// ── onPush scenarios ──────────────────────────────────────────────────────────

const onPushScenarios: Array<{ description: string; capacity: number; items: number[]; expectedPushCount: number }> = [
  {
    description: 'onPush is called on each push (3 pushes)',
    capacity: 8,
    items: [1, 2, 3],
    expectedPushCount: 3,
  },
  {
    description: 'onPush is called on push that triggers grow',
    capacity: 2,
    items: [1, 2, 3],
    expectedPushCount: 3,
  },
];

for (const { description, capacity, items, expectedPushCount } of onPushScenarios) {
  it(description, () => {
    const buf = new PushCountBuffer<number>(capacity);
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
    const buf = new ShiftLogBuffer<number>(capacity);
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

  const buf = new LengthCheckBuffer(8);
  buf.push(42);

  assert.strictEqual(lengthAtHook, 1);
});

it('onGrow receives correct old and new capacity', () => {
  const buf = new GrowLogBuffer<number>(4);
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

it('base class still operates correctly after grow', () => {
  const buf = new GrowLogBuffer<number>(2);
  buf.push(1);
  buf.push(2);
  buf.push(3); // triggers grow

  assert.strictEqual(buf.length, 3);
  assert.strictEqual(buf.shift(), 1);
  assert.strictEqual(buf.shift(), 2);
  assert.strictEqual(buf.shift(), 3);
});

it('onShift received value matches shift return value', () => {
  const buf = new ShiftLogBuffer<string>(4);
  buf.push('hello');
  const returned = buf.shift();

  assert.strictEqual(returned, 'hello');
  assert.deepStrictEqual(buf.shiftLog, ['hello']);
});

it('FullTraceBuffer tracks grow, push, and shift events independently', () => {
  const buf = new FullTraceBuffer<number>(2);
  buf.push(1);
  buf.push(2);
  buf.push(3); // triggers grow
  buf.shift();
  buf.shift();

  assert.strictEqual(buf.growEvents.length, 1);
  assert.strictEqual(buf.pushItems.length, 3);
  assert.strictEqual(buf.shiftItems.length, 2);
});

it('buffer produces correct FIFO order with all hooks active', () => {
  const buf = new FullTraceBuffer<number>(2);
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

  const buf = new InspectBuffer<number>(4);
  buf.push(1);
  buf.push(2);
  buf.shift();

  const state = buf.inspect();
  assert.strictEqual(state.length, 1);
  assert.strictEqual(state.capacity, 4);
});
