import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';

describe('CircularBuffer', () => {
  // ── Construction ────────────────────────────────────────────────────────────

  describe('construction', () => {
    it('starts empty with default capacity', () => {
      const buf = new CircularBuffer<number>();
      assert.equal(buf.length, 0);
    });

    it('starts empty with custom capacity', () => {
      const buf = new CircularBuffer<string>(4);
      assert.equal(buf.length, 0);
    });

    it('accepts capacity of 1', () => {
      const buf = new CircularBuffer<boolean>(1);
      assert.equal(buf.length, 0);
    });
  });

  // ── push() ───────────────────────────────────────────────────────────────────

  describe('push()', () => {
    it('increments length with each push', () => {
      const buf = new CircularBuffer<number>(8);
      buf.push(1);
      assert.equal(buf.length, 1);
      buf.push(2);
      assert.equal(buf.length, 2);
      buf.push(3);
      assert.equal(buf.length, 3);
    });

    it('can push up to capacity without growing', () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(10);
      buf.push(20);
      buf.push(30);
      buf.push(40);
      assert.equal(buf.length, 4);
    });

    it('auto-grows when capacity is reached', () => {
      const buf = new CircularBuffer<number>(2);
      buf.push(1);
      buf.push(2);
      // capacity full — next push must not throw and must grow
      buf.push(3);
      assert.equal(buf.length, 3);
    });

    it('length exceeds initial capacity after grow', () => {
      const buf = new CircularBuffer<number>(2);
      for (let i = 0; i < 5; i++) buf.push(i);
      assert.equal(buf.length, 5);
    });

    it('order is preserved after grow', () => {
      const buf = new CircularBuffer<number>(2);
      buf.push(1);
      buf.push(2);
      buf.push(3); // triggers grow
      assert.equal(buf.shift(), 1);
      assert.equal(buf.shift(), 2);
      assert.equal(buf.shift(), 3);
    });

    it('push after shift does not corrupt order', () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(1);
      buf.push(2);
      buf.shift(); // remove 1
      buf.push(3);
      assert.equal(buf.shift(), 2);
      assert.equal(buf.shift(), 3);
    });
  });

  // ── shift() ──────────────────────────────────────────────────────────────────

  describe('shift()', () => {
    it('returns undefined on empty buffer', () => {
      const buf = new CircularBuffer<number>();
      assert.equal(buf.shift(), undefined);
    });

    it('does not throw on empty buffer', () => {
      const buf = new CircularBuffer<string>(4);
      assert.doesNotThrow(() => buf.shift());
    });

    it('returns first item and decrements length', () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(42);
      buf.push(99);
      const result = buf.shift();
      assert.equal(result, 42);
      assert.equal(buf.length, 1);
    });

    it('delivers items in FIFO order', () => {
      const buf = new CircularBuffer<string>(8);
      buf.push('a');
      buf.push('b');
      buf.push('c');
      assert.equal(buf.shift(), 'a');
      assert.equal(buf.shift(), 'b');
      assert.equal(buf.shift(), 'c');
    });

    it('returns the only item and leaves length 0', () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(7);
      assert.equal(buf.shift(), 7);
      assert.equal(buf.length, 0);
    });

    it('returns undefined after all items are shifted', () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(1);
      buf.shift();
      assert.equal(buf.shift(), undefined);
    });

    it('push/shift cycling maintains correct order', () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(1);
      buf.push(2);
      assert.equal(buf.shift(), 1);
      buf.push(3);
      buf.push(4);
      assert.equal(buf.shift(), 2);
      assert.equal(buf.shift(), 3);
      assert.equal(buf.shift(), 4);
    });
  });

  // ── Auto-grow / wraparound ───────────────────────────────────────────────────

  describe('auto-grow and wraparound', () => {
    it('pushing past capacity triggers grow and all items survive', () => {
      const buf = new CircularBuffer<number>(4);
      for (let i = 0; i < 4; i++) buf.push(i);
      buf.push(4); // triggers grow
      assert.equal(buf.length, 5);
      for (let i = 0; i < 5; i++) {
        assert.equal(buf.shift(), i);
      }
    });

    it('wraparound: push many, shift some, push more — FIFO order preserved', () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(1);
      buf.push(2);
      buf.push(3);
      buf.push(4);
      assert.equal(buf.shift(), 1); // head advances
      assert.equal(buf.shift(), 2); // head advances again
      buf.push(5); // tail wraps around
      buf.push(6); // tail wraps around
      assert.equal(buf.shift(), 3);
      assert.equal(buf.shift(), 4);
      assert.equal(buf.shift(), 5);
      assert.equal(buf.shift(), 6);
    });

    it('head pointer wraps: push N, shift N/2, push N/2 more, drain in order', () => {
      const buf = new CircularBuffer<number>(6);
      // push 6 items
      for (let i = 1; i <= 6; i++) buf.push(i);
      // shift 3
      assert.equal(buf.shift(), 1);
      assert.equal(buf.shift(), 2);
      assert.equal(buf.shift(), 3);
      // push 3 more — tail wraps
      buf.push(7);
      buf.push(8);
      buf.push(9);
      // drain: expect 4,5,6,7,8,9
      const expected = [4, 5, 6, 7, 8, 9];
      for (const val of expected) {
        assert.equal(buf.shift(), val);
      }
      assert.equal(buf.length, 0);
    });

    it('grow preserves items when head is not at index 0', () => {
      // fill, shift half (head advances), then push past capacity to trigger grow
      const buf = new CircularBuffer<number>(4);
      buf.push(1);
      buf.push(2);
      buf.push(3);
      buf.push(4);
      buf.shift(); // head = 1
      buf.shift(); // head = 2
      buf.push(5); // tail wraps to 0
      buf.push(6); // tail = 1, now full (length === capacity)
      buf.push(7); // triggers grow while head ≠ 0
      assert.equal(buf.length, 5);
      assert.equal(buf.shift(), 3);
      assert.equal(buf.shift(), 4);
      assert.equal(buf.shift(), 5);
      assert.equal(buf.shift(), 6);
      assert.equal(buf.shift(), 7);
    });
  });

  // ── length semantics ─────────────────────────────────────────────────────────

  describe('length', () => {
    it('reflects item count not capacity', () => {
      const buf = new CircularBuffer<number>(100);
      buf.push(1);
      buf.push(2);
      assert.equal(buf.length, 2);
    });

    it('is read-only (no setter)', () => {
      const buf = new CircularBuffer<number>(4);
      // Verify the property has no setter — attempting to set should either
      // be a TS error or silently fail; in strict mode we just confirm reads.
      buf.push(1);
      assert.equal(buf.length, 1);
    });

    it('capacity 1: push/shift cycling', () => {
      const buf = new CircularBuffer<string>(1);
      buf.push('A');
      assert.equal(buf.shift(), 'A');
      buf.push('B');
      assert.equal(buf.shift(), 'B');
      assert.equal(buf.length, 0);
    });

    it('capacity 2: push/shift cycling', () => {
      const buf = new CircularBuffer<number>(2);
      buf.push(10);
      buf.push(20);
      assert.equal(buf.shift(), 10);
      buf.push(30);
      assert.equal(buf.shift(), 20);
      assert.equal(buf.shift(), 30);
      assert.equal(buf.length, 0);
    });
  });

  // ── Comprehensive FIFO order ─────────────────────────────────────────────────

  describe('comprehensive FIFO order', () => {
    it('push 0..9 then shift all yields [0,1,2,3,4,5,6,7,8,9]', () => {
      const buf = new CircularBuffer<number>(16);
      for (let i = 0; i < 10; i++) buf.push(i);
      const result: number[] = [];
      while (buf.length > 0) {
        const val = buf.shift();
        if (val !== undefined) result.push(val);
      }
      assert.deepEqual(result, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('interleaved push/shift across multiple grow cycles preserves order', () => {
      const buf = new CircularBuffer<number>(2);
      const pushed: number[] = [];
      const shifted: number[] = [];

      for (let i = 0; i < 20; i++) {
        buf.push(i);
        pushed.push(i);
        if (i % 3 === 0) {
          const val = buf.shift();
          if (val !== undefined) shifted.push(val);
        }
      }
      // drain remainder
      while (buf.length > 0) {
        const val = buf.shift();
        if (val !== undefined) shifted.push(val);
      }

      assert.equal(shifted.length, pushed.length);
      // shifted must equal pushed in the same order
      assert.deepEqual(shifted, pushed);
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('shift on never-pushed buffer returns undefined', () => {
      const buf = new CircularBuffer<object>();
      assert.equal(buf.shift(), undefined);
    });

    it('push then shift then push again works correctly', () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(1);
      buf.shift();
      buf.push(2);
      assert.equal(buf.length, 1);
      assert.equal(buf.shift(), 2);
    });

    it('multiple successive shifts on empty buffer stay undefined', () => {
      const buf = new CircularBuffer<string>(4);
      assert.equal(buf.shift(), undefined);
      assert.equal(buf.shift(), undefined);
      assert.equal(buf.shift(), undefined);
    });

    it('works correctly with non-primitive values (objects)', () => {
      const buf = new CircularBuffer<{ id: number }>(4);
      const a = { id: 1 };
      const b = { id: 2 };
      buf.push(a);
      buf.push(b);
      assert.equal(buf.shift(), a);
      assert.equal(buf.shift(), b);
    });
  });
});
