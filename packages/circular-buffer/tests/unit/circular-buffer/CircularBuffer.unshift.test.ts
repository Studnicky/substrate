import assert from 'node:assert/strict';
import { it } from 'node:test';

import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';

// ── Basic unshift ──────────────────────────────────────────────────────────

it('unshift adds an item and increments length', () => {
  const buf = CircularBuffer.create<number>({ 'capacity': 4 });
  buf.unshift(1);
  assert.equal(buf.length, 1);
});

it('unshift on empty buffer then shift returns the unshifted item', () => {
  const buf = CircularBuffer.create<number>({ 'capacity': 4 });
  buf.unshift(1);
  assert.equal(buf.shift(), 1);
  assert.equal(buf.length, 0);
});

// ── unshift-then-shift ordering ──────────────────────────────────────────────

it('unshift-then-shift: item unshifted comes out first on next shift', () => {
  const buf = CircularBuffer.create<number>({ 'capacity': 4 });
  buf.push(1);
  buf.push(2);
  buf.unshift(0);
  assert.equal(buf.shift(), 0);
  assert.equal(buf.shift(), 1);
  assert.equal(buf.shift(), 2);
});

it('multiple unshifts preserve reverse-insertion order at the front', () => {
  const buf = CircularBuffer.create<number>({ 'capacity': 8 });
  buf.push(3);
  buf.unshift(2);
  buf.unshift(1);
  buf.unshift(0);
  const result: number[] = [];
  while (buf.length > 0) {
    const val = buf.shift();
    if (val !== undefined) result.push(val);
  }
  assert.deepEqual(result, [0, 1, 2, 3]);
});

// ── unshift at capacity: overwrite mode ───────────────────────────────────────

it('unshift at capacity (overwrite mode) evicts from the tail, keeping length at capacity', () => {
  const buf = CircularBuffer.create<number>({ 'capacity': 3 });
  buf.push(1);
  buf.push(2);
  buf.push(3);
  buf.unshift(0); // evicts 3 (tail), new front is 0
  assert.equal(buf.length, 3);
  assert.equal(buf.shift(), 0);
  assert.equal(buf.shift(), 1);
  assert.equal(buf.shift(), 2);
});

it('unshift at capacity (overwrite mode) fires onOverflow and onEvict with the displaced tail item', () => {
  class TraceBuffer<T> extends CircularBuffer<T> {
    readonly overflowLog: T[] = [];
    readonly evictLog: T[] = [];

    override onOverflow(item: T): void {
      this.overflowLog.push(item);
    }

    override onEvict(item: T): void {
      this.evictLog.push(item);
    }
  }

  const buf = TraceBuffer.create<number>({ 'capacity': 2 });
  buf.push(1);
  buf.push(2);
  buf.unshift(0); // overflow incoming=0, evicts 2 (tail)

  assert.deepStrictEqual(buf.overflowLog, [0]);
  assert.deepStrictEqual(buf.evictLog, [2]);
});

// ── unshift at capacity: grow mode ────────────────────────────────────────────

it('unshift at capacity (grow mode) grows instead of evicting, preserving all items', () => {
  const buf = CircularBuffer.create<number>({ 'capacity': 2, 'overflow': 'grow' });
  buf.push(1);
  buf.push(2);
  buf.unshift(0); // triggers grow
  assert.equal(buf.length, 3);
  assert.equal(buf.shift(), 0);
  assert.equal(buf.shift(), 1);
  assert.equal(buf.shift(), 2);
});

it('unshift at capacity (grow mode) fires onGrow', () => {
  class GrowLogBuffer<T> extends CircularBuffer<T> {
    readonly growLog: Array<{ oldCapacity: number; newCapacity: number }> = [];

    override onGrow(oldCapacity: number, newCapacity: number): void {
      this.growLog.push({ oldCapacity, newCapacity });
    }
  }

  const buf = GrowLogBuffer.create<number>({ 'capacity': 2, 'overflow': 'grow' });
  buf.push(1);
  buf.push(2);
  buf.unshift(0); // triggers grow

  assert.strictEqual(buf.growLog.length, 1);
  assert.strictEqual(buf.growLog[0]?.oldCapacity, 2);
  assert.strictEqual(buf.growLog[0]?.newCapacity, 4);
});

// ── onPush hook fires for unshift too ─────────────────────────────────────────

it('onPush fires for unshift (shared insertion hook)', () => {
  class PushCountBuffer<T> extends CircularBuffer<T> {
    pushCount = 0;

    override onPush(_item: T): void {
      this.pushCount++;
    }
  }

  const buf = PushCountBuffer.create<number>({ 'capacity': 4 });
  buf.push(1);
  buf.unshift(0);
  assert.strictEqual(buf.pushCount, 2);
});

// ── mixed push/unshift/shift ordering ─────────────────────────────────────────

it('mixed usage is FIFO-correct from both ends: push A, push B, unshift C, shift -> C, A, B', () => {
  const buf = CircularBuffer.create<string>({ 'capacity': 4 });
  buf.push('A');
  buf.push('B');
  buf.unshift('C');
  assert.equal(buf.shift(), 'C');
  assert.equal(buf.shift(), 'A');
  assert.equal(buf.shift(), 'B');
});

it('interleaved push/unshift/shift across wraparound preserves order', () => {
  const buf = CircularBuffer.create<number>({ 'capacity': 4 });
  buf.push(1);
  buf.push(2);
  assert.equal(buf.shift(), 1);
  buf.unshift(0);
  buf.push(3);
  buf.unshift(-1);
  const result: number[] = [];
  while (buf.length > 0) {
    const val = buf.shift();
    if (val !== undefined) result.push(val);
  }
  assert.deepEqual(result, [-1, 0, 2, 3]);
});
