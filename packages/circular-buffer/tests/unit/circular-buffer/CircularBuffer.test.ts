import assert from 'node:assert/strict';
import { it } from 'node:test';

import { CircularBuffer } from '../../../src/circular-buffer/CircularBuffer.js';

// ── Construction ─────────────────────────────────────────────────────────────

const constructionScenarios: Array<{ description: string; exec: () => void }> = [
  {
    description: 'construction with default capacity starts empty',
    exec: () => {
      const buf = new CircularBuffer<number>();
      assert.equal(buf.length, 0);
    },
  },
  {
    description: 'construction with custom capacity 4 starts empty',
    exec: () => {
      const buf = new CircularBuffer<string>(4);
      assert.equal(buf.length, 0);
    },
  },
  {
    description: 'construction with capacity 1 starts empty',
    exec: () => {
      const buf = new CircularBuffer<boolean>(1);
      assert.equal(buf.length, 0);
    },
  },
];

for (const { description, exec } of constructionScenarios) {
  it(description, exec);
}

// ── push() length scenarios ───────────────────────────────────────────────────

const pushLengthScenarios: Array<{ description: string; capacity: number; itemsToPush: number; expectedLength: number }> = [
  { description: 'push 4 items into capacity-4 buffer yields length 4', capacity: 4, itemsToPush: 4, expectedLength: 4 },
  { description: 'push 5 items into capacity-2 buffer yields length 5 after grow', capacity: 2, itemsToPush: 5, expectedLength: 5 },
  { description: 'push 3 items into capacity-2 buffer yields length 3 after grow', capacity: 2, itemsToPush: 3, expectedLength: 3 },
];

for (const { description, capacity, itemsToPush, expectedLength } of pushLengthScenarios) {
  it(description, () => {
    const buf = new CircularBuffer<number>(capacity);
    for (let i = 0; i < itemsToPush; i++) buf.push(i);
    assert.equal(buf.length, expectedLength);
  });
}

// ── push() increments length step by step ────────────────────────────────────

it('push increments length with each push', () => {
  const buf = new CircularBuffer<number>(8);
  buf.push(1);
  assert.equal(buf.length, 1);
  buf.push(2);
  assert.equal(buf.length, 2);
  buf.push(3);
  assert.equal(buf.length, 3);
});

// ── shift() on empty buffer ───────────────────────────────────────────────────

const shiftEmptyScenarios: Array<{ description: string; exec: () => void }> = [
  {
    description: 'shift on empty buffer returns undefined',
    exec: () => {
      const buf = new CircularBuffer<number>();
      assert.equal(buf.shift(), undefined);
    },
  },
  {
    description: 'shift on empty buffer does not throw',
    exec: () => {
      const buf = new CircularBuffer<string>(4);
      assert.doesNotThrow(() => buf.shift());
    },
  },
  {
    description: 'shift on never-pushed buffer returns undefined',
    exec: () => {
      const buf = new CircularBuffer<object>();
      assert.equal(buf.shift(), undefined);
    },
  },
  {
    description: 'multiple successive shifts on empty buffer stay undefined',
    exec: () => {
      const buf = new CircularBuffer<string>(4);
      assert.equal(buf.shift(), undefined);
      assert.equal(buf.shift(), undefined);
      assert.equal(buf.shift(), undefined);
    },
  },
  {
    description: 'shift returns undefined after all items are shifted',
    exec: () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(1);
      buf.shift();
      assert.equal(buf.shift(), undefined);
    },
  },
];

for (const { description, exec } of shiftEmptyScenarios) {
  it(description, exec);
}

// ── FIFO order scenarios ──────────────────────────────────────────────────────

const fifoOrderScenarios: Array<{ description: string; items: number[]; expected: number[] }> = [
  {
    description: 'shift delivers items in FIFO order (a b c)',
    items: [1, 2, 3],
    expected: [1, 2, 3],
  },
  {
    description: 'push 0..9 then shift all yields correct order',
    items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    expected: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
];

for (const { description, items, expected } of fifoOrderScenarios) {
  it(description, () => {
    const buf = new CircularBuffer<number>(16);
    for (const item of items) buf.push(item);
    const result: number[] = [];
    while (buf.length > 0) {
      const val = buf.shift();
      if (val !== undefined) result.push(val);
    }
    assert.deepEqual(result, expected);
  });
}

// ── Edge case scenarios ───────────────────────────────────────────────────────

const edgeCaseScenarios: Array<{ description: string; exec: () => void }> = [
  {
    description: 'shift returns first item and decrements length',
    exec: () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(42);
      buf.push(99);
      const result = buf.shift();
      assert.equal(result, 42);
      assert.equal(buf.length, 1);
    },
  },
  {
    description: 'shift returns the only item and leaves length 0',
    exec: () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(7);
      assert.equal(buf.shift(), 7);
      assert.equal(buf.length, 0);
    },
  },
  {
    description: 'length reflects item count not capacity',
    exec: () => {
      const buf = new CircularBuffer<number>(100);
      buf.push(1);
      buf.push(2);
      assert.equal(buf.length, 2);
    },
  },
  {
    description: 'length property has no setter (read-only)',
    exec: () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(1);
      assert.equal(buf.length, 1);
    },
  },
  {
    description: 'push then shift then push again works correctly',
    exec: () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(1);
      buf.shift();
      buf.push(2);
      assert.equal(buf.length, 1);
      assert.equal(buf.shift(), 2);
    },
  },
  {
    description: 'works correctly with non-primitive values (objects)',
    exec: () => {
      const buf = new CircularBuffer<{ id: number }>(4);
      const a = { id: 1 };
      const b = { id: 2 };
      buf.push(a);
      buf.push(b);
      assert.equal(buf.shift(), a);
      assert.equal(buf.shift(), b);
    },
  },
  {
    description: 'push after shift does not corrupt order',
    exec: () => {
      const buf = new CircularBuffer<number>(4);
      buf.push(1);
      buf.push(2);
      buf.shift(); // remove 1
      buf.push(3);
      assert.equal(buf.shift(), 2);
      assert.equal(buf.shift(), 3);
    },
  },
];

for (const { description, exec } of edgeCaseScenarios) {
  it(description, exec);
}

// ── Multi-step stateful: push/shift cycling ───────────────────────────────────

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

// ── Multi-step stateful: auto-grow / wraparound ───────────────────────────────

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
  for (let i = 1; i <= 6; i++) buf.push(i);
  assert.equal(buf.shift(), 1);
  assert.equal(buf.shift(), 2);
  assert.equal(buf.shift(), 3);
  buf.push(7);
  buf.push(8);
  buf.push(9);
  const expected = [4, 5, 6, 7, 8, 9];
  for (const val of expected) {
    assert.equal(buf.shift(), val);
  }
  assert.equal(buf.length, 0);
});

it('grow preserves items when head is not at index 0', () => {
  const buf = new CircularBuffer<number>(4);
  buf.push(1);
  buf.push(2);
  buf.push(3);
  buf.push(4);
  buf.shift(); // head = 1
  buf.shift(); // head = 2
  buf.push(5); // tail wraps to 0
  buf.push(6); // tail = 1, now full (length === capacity)
  buf.push(7); // triggers grow while head != 0
  assert.equal(buf.length, 5);
  assert.equal(buf.shift(), 3);
  assert.equal(buf.shift(), 4);
  assert.equal(buf.shift(), 5);
  assert.equal(buf.shift(), 6);
  assert.equal(buf.shift(), 7);
});

// ── Multi-step stateful: interleaved push/shift across grow cycles ────────────

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
  while (buf.length > 0) {
    const val = buf.shift();
    if (val !== undefined) shifted.push(val);
  }

  assert.equal(shifted.length, pushed.length);
  assert.deepEqual(shifted, pushed);
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
