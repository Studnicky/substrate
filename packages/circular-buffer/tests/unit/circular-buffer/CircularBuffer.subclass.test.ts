/**
 * Subclass extension tests for CircularBuffer
 *
 * Verifies that the protected seams (fields + hooks) are reachable and
 * overridable by a consumer subclass.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';

// ── Test subclass ────────────────────────────────────────────────────────────

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

// Subclass that overrides all three hooks
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

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CircularBuffer subclass extension', () => {
  describe('onGrow hook', () => {
    it('is called when capacity is exceeded', () => {
      const buf = new GrowLogBuffer<number>(2);
      buf.push(1);
      buf.push(2);
      buf.push(3); // triggers grow

      assert.strictEqual(buf.growLog.length, 1);
    });

    it('receives correct old and new capacity', () => {
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

    it('is called once per grow event', () => {
      const buf = new GrowLogBuffer<number>(2);
      // Fill 2, trigger grow to 4; fill 4, trigger grow to 8
      for (let i = 0; i < 5; i++) buf.push(i);

      assert.strictEqual(buf.growLog.length, 2);
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
  });

  describe('onPush hook', () => {
    it('is called on each push', () => {
      const buf = new PushCountBuffer<string>(8);
      buf.push('a');
      buf.push('b');
      buf.push('c');

      assert.strictEqual(buf.pushCount, 3);
    });

    it('is called after push (length is already incremented)', () => {
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

    it('is called on push that triggers grow', () => {
      const buf = new PushCountBuffer<number>(2);
      buf.push(1);
      buf.push(2);
      buf.push(3); // triggers grow, then push

      assert.strictEqual(buf.pushCount, 3);
    });
  });

  describe('onShift hook', () => {
    it('is called with the item before it is returned', () => {
      const buf = new ShiftLogBuffer<number>(4);
      buf.push(10);
      buf.push(20);
      buf.shift();
      buf.shift();

      assert.deepStrictEqual(buf.shiftLog, [10, 20]);
    });

    it('is not called when buffer is empty', () => {
      const buf = new ShiftLogBuffer<number>(4);
      buf.shift(); // empty — hook must not fire

      assert.strictEqual(buf.shiftLog.length, 0);
    });

    it('receives the correct item value', () => {
      const buf = new ShiftLogBuffer<string>(4);
      buf.push('hello');
      const returned = buf.shift();

      assert.strictEqual(returned, 'hello');
      assert.deepStrictEqual(buf.shiftLog, ['hello']);
    });
  });

  describe('all three hooks together (FullTraceBuffer)', () => {
    it('tracks grow, push, and shift events independently', () => {
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
  });

  describe('protected field access from subclass', () => {
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
  });
});
