/**
 * Subclass extension tests for CircularBuffer
 *
 * Verifies that the protected seams (fields + hooks) are reachable and
 * overridable by a consumer subclass.
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { HookInvocationError, ReentrantHookInvocationError } from '@studnicky/errors';

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

class ThrowingPushBuffer<T> extends CircularBuffer<T> {
  override onPush(): void {
    throw new Error('onPush boom');
  }
}

class ThrowingOverflowBuffer<T> extends CircularBuffer<T> {
  override onOverflow(): void {
    throw new Error('onOverflow boom');
  }
}

class ThrowingEvictBuffer<T> extends CircularBuffer<T> {
  override onEvict(): void {
    throw new Error('onEvict boom');
  }
}

class ThrowingGrowBuffer<T> extends CircularBuffer<T> {
  override onGrow(): void {
    throw new Error('onGrow boom');
  }
}

class ThrowingShiftBuffer<T> extends CircularBuffer<T> {
  override onShift(): void {
    throw new Error('onShift boom');
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
      lengthAtHook = this.count;
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

it('a throwing onPush hook surfaces a HookInvocationError after the push has already been committed', () => {
  const buf = ThrowingPushBuffer.create<number>({ 'capacity': 4 });
  let caught: unknown;
  try {
    buf.push(42);
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof HookInvocationError);
  assert.strictEqual((caught as HookInvocationError).hookName, 'onPush');
  // onPush fires after the item is already written — the push is not undone.
  assert.strictEqual(buf.length, 1);
  assert.strictEqual(buf.shift(), 42);
});

it('a throwing onOverflow hook surfaces a HookInvocationError after eviction and insertion are already committed', () => {
  const buf = ThrowingOverflowBuffer.create<number>({ 'capacity': 2 });
  buf.push(1);
  buf.push(2);

  let caught: unknown;
  try {
    buf.push(3);
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof HookInvocationError);
  assert.strictEqual((caught as HookInvocationError).hookName, 'onOverflow');
  // onOverflow fires after head/tail/items are fully committed — item 3 has
  // already replaced evicted item 1.
  assert.strictEqual(buf.length, 2);
  assert.strictEqual(buf.shift(), 2);
  assert.strictEqual(buf.shift(), 3);
});

it('a throwing onEvict hook surfaces a HookInvocationError after the slot has already been overwritten', () => {
  const buf = ThrowingEvictBuffer.create<number>({ 'capacity': 2 });
  buf.push(1);
  buf.push(2);

  let caught: unknown;
  try {
    buf.push(3);
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof HookInvocationError);
  assert.strictEqual((caught as HookInvocationError).hookName, 'onEvict');
  // onEvict fires after head advances and the slot is overwritten — item 3
  // has already replaced evicted item 1.
  assert.strictEqual(buf.length, 2);
  assert.strictEqual(buf.shift(), 2);
  assert.strictEqual(buf.shift(), 3);
});

it('a throwing onGrow hook surfaces a HookInvocationError after the resize completes; the triggering push never lands', () => {
  const buf = ThrowingGrowBuffer.create<number>({ 'capacity': 2, 'overflow': 'grow' });
  buf.push(1);
  buf.push(2);

  let caught: unknown;
  try {
    buf.push(3);
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof HookInvocationError);
  assert.strictEqual((caught as HookInvocationError).hookName, 'onGrow');
  // grow() itself completes (capacity doubled) before onGrow fires; the item
  // that triggered the grow is never appended once the hook throws.
  assert.strictEqual(buf.length, 2);
  assert.deepStrictEqual([buf.shift(), buf.shift()], [1, 2]);
});

it('a throwing onShift hook surfaces a HookInvocationError after the item has already been removed', () => {
  const buf = ThrowingShiftBuffer.create<number>({ 'capacity': 2 });
  buf.push(1);

  let caught: unknown;
  try {
    buf.shift();
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof HookInvocationError);
  assert.strictEqual((caught as HookInvocationError).hookName, 'onShift');
  // Removal already happened internally before onShift fires.
  assert.strictEqual(buf.length, 0);
});

// ── Regression: async hook override must route through HookInvoker safely ────
// (fixes call sites like `this.hooks.invoke('onPush', () => { this.onPush(item); })`
// that discarded the hook's return value in a block-bodied arrow, defeating
// HookInvoker's async-detection — a rejecting async override would otherwise
// produce an unhandled promise rejection instead of routing through onHookError.)

class AsyncRejectingPushBuffer<T> extends CircularBuffer<T> {
  override async onPush(_item: T): Promise<void> {
    await Promise.resolve();
    throw new Error('async onPush boom');
  }
}

it('an async-overridden onPush hook that rejects routes through onHookError without producing an unhandled rejection', async () => {
  const buf = AsyncRejectingPushBuffer.create<number>({ 'capacity': 4 });
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    // push() itself stays synchronous and returns void — the async hook
    // override's eventual rejection must not surface here nor escape as an
    // unhandled rejection.
    buf.push(1);

    // push() already committed the item before the hook fired.
    assert.strictEqual(buf.length, 1);

    // Give the microtask queue a couple of turns to let the hook's rejection
    // route through HookInvoker's default onHookError (which rethrows as a
    // HookInvocationError inside the pending promise HookInvoker tracks
    // internally — never surfaced as a process-level unhandled rejection).
    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });

    assert.strictEqual(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

it('subclass can read count, head, tail, capacity, items', () => {
  class InspectBuffer<T> extends CircularBuffer<T> {
    inspect(): { length: number; head: number; tail: number; capacity: number } {
      return {
        capacity: this.capacity,
        head: this.head,
        length: this.count,
        tail: this.tail,
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

// ── Regression: hooks must fire when the item's VALUE is undefined ───────────
// (occupancy is tracked via count/capacity, not by checking the dequeued value)

it('onEvict fires with undefined when the evicted slot holds an item whose value is undefined', () => {
  const buf = EvictLogBuffer.create<number | undefined>({ 'capacity': 2 });
  buf.push(undefined);
  buf.push(2);
  buf.push(3); // evicts the undefined-valued item
  assert.deepStrictEqual(buf.evictLog, [undefined]);
});

it('onShift fires with undefined when the shifted item holds a value of undefined', () => {
  const buf = ShiftLogBuffer.create<number | undefined>({ 'capacity': 4 });
  buf.push(undefined);
  const returned = buf.shift();

  assert.strictEqual(returned, undefined);
  assert.deepStrictEqual(buf.shiftLog, [undefined]);
});

// ── Regression: reentrancy guard on overwrite eviction ────────────────────────
// (a hook override that reentrantly calls push()/unshift()/shift() on the
// same instance is rejected by CircularBuffer's own #dispatching guard at
// entry — before it can mutate head/tail/items — so the ring never observes
// a double eviction. This is stronger than relying solely on HookInvoker's
// `detectReentrancy` option, which only trips once the reentrant call
// reaches its own `hooks.invoke`, by which point it would already have
// mutated shared state.)

class ReentrantOverflowBuffer<T> extends CircularBuffer<T> {
  reentrantError: unknown;
  #reentering = false;

  override onOverflow(item: T): void {
    if (this.#reentering) return;
    this.#reentering = true;
    try {
      this.push(item);
    } catch (error) {
      this.reentrantError = error;
    } finally {
      this.#reentering = false;
    }
  }
}

it('a reentrant push() from within onOverflow throws ReentrantHookInvocationError and leaves the buffer uncorrupted', () => {
  const buf = ReentrantOverflowBuffer.create<number>({ 'capacity': 2 });
  buf.push(1);
  buf.push(2);

  buf.push(3); // overflow: onOverflow reentrantly calls push(3) again on the same instance

  assert.ok(buf.reentrantError instanceof ReentrantHookInvocationError);
  // The outer push(3) call itself completes normally — the reentrant call's
  // own failure is caught inside the onOverflow override and does not
  // propagate out of the outer push(). Because the reentrant call is
  // rejected before it can mutate anything, the ring reflects exactly one
  // eviction: the oldest item (1) is gone, replaced by 3, leaving [2, 3] in
  // FIFO order — not a double-evicted or duplicated ring.
  assert.strictEqual(buf.length, 2);
  const contents: number[] = [];
  while (buf.length > 0) {
    const value = buf.shift();
    if (value !== undefined) contents.push(value);
  }
  assert.deepStrictEqual(contents, [2, 3]);
});

class ReentrantEvictBuffer<T> extends CircularBuffer<T> {
  reentrantError: unknown;
  #reentering = false;

  override onEvict(_item: T): void {
    if (this.#reentering) return;
    this.#reentering = true;
    try {
      // Reentrant call happens with a distinct item so it's identifiable if
      // it (incorrectly) lands.
      this.push(999 as unknown as T);
    } catch (error) {
      this.reentrantError = error;
    } finally {
      this.#reentering = false;
    }
  }
}

it('a reentrant push() from within onEvict throws ReentrantHookInvocationError and leaves the buffer uncorrupted', () => {
  const buf = ReentrantEvictBuffer.create<number>({ 'capacity': 2 });
  buf.push(1);
  buf.push(2);

  buf.push(3); // overflow: onEvict reentrantly calls push(999) again on the same instance

  assert.ok(buf.reentrantError instanceof ReentrantHookInvocationError);
  // The reentrant push(999) never lands — it is rejected before mutating
  // anything, so 999 never appears in the buffer. The ring reflects exactly
  // one eviction: [2, 3] in FIFO order.
  assert.strictEqual(buf.length, 2);
  const contents: number[] = [];
  while (buf.length > 0) {
    const value = buf.shift();
    if (value !== undefined) contents.push(value);
  }
  assert.deepStrictEqual(contents, [2, 3]);
});

class ReentrantShiftBuffer<T> extends CircularBuffer<T> {
  reentrantError: unknown;
  #reentering = false;

  override onShift(_item: T): void {
    if (this.#reentering) return;
    this.#reentering = true;
    try {
      this.shift();
    } catch (error) {
      this.reentrantError = error;
    } finally {
      this.#reentering = false;
    }
  }
}

it('a reentrant shift() from within onShift throws ReentrantHookInvocationError and does not double-remove', () => {
  const buf = ReentrantShiftBuffer.create<number>({ 'capacity': 4 });
  buf.push(1);
  buf.push(2);

  const first = buf.shift(); // onShift reentrantly calls shift() again on the same instance

  assert.strictEqual(first, 1);
  assert.ok(buf.reentrantError instanceof ReentrantHookInvocationError);
  // The reentrant shift() is rejected before it can remove anything, so item
  // 2 is still there — a corrupted guard would have removed it too.
  assert.strictEqual(buf.length, 1);
  assert.strictEqual(buf.shift(), 2);
});

class ReentrantGrowBuffer<T> extends CircularBuffer<T> {
  reentrantError: unknown;
  readonly growLog: Array<{ oldCapacity: number; newCapacity: number }> = [];
  #reentering = false;

  override onGrow(oldCapacity: number, newCapacity: number): void {
    this.growLog.push({ oldCapacity, newCapacity });
    if (this.#reentering) return;
    this.#reentering = true;
    try {
      this.growPublicly();
    } catch (error) {
      this.reentrantError = error;
    } finally {
      this.#reentering = false;
    }
  }

  growPublicly(): void {
    this.grow();
  }
}

it('a reentrant grow() from within onGrow throws ReentrantHookInvocationError and does not double-resize', () => {
  const buf = ReentrantGrowBuffer.create<number>({ 'capacity': 2, 'overflow': 'grow' });
  buf.push(1);
  buf.push(2);

  buf.push(3); // triggers grow(); onGrow reentrantly calls grow() again on the same instance

  assert.ok(buf.reentrantError instanceof ReentrantHookInvocationError);
  assert.deepStrictEqual([buf.shift(), buf.shift(), buf.shift()], [1, 2, 3]);

  // Capacity doubled exactly once (2 -> 4), not twice (2 -> 8): filling the
  // buffer back up to exactly 4 items must trigger the NEXT grow from an
  // oldCapacity of 4, not 8, proving the reentrant grow() call never landed.
  buf.push(10);
  buf.push(11);
  buf.push(12);
  buf.push(13); // capacity 4 exactly full, no grow yet
  assert.deepStrictEqual(buf.growLog.map((entry) => entry.oldCapacity), [2]);
  buf.push(14); // exceeds capacity 4 -> triggers the next grow
  assert.deepStrictEqual(
    buf.growLog.map((entry) => entry.oldCapacity),
    [2, 4]
  );
});
