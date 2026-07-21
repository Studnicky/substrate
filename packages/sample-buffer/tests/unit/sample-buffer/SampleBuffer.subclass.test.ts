/**
 * Subclass extension tests for SampleBuffer
 *
 * Verifies that the protected seams (fields + hooks) are reachable and
 * overridable by a consumer subclass.
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import { SampleBuffer } from '../../../src/sample-buffer/SampleBuffer.js';

// ── Test subclasses ──────────────────────────────────────────────────────────

class EvictTracker extends SampleBuffer {
  readonly evictedValues: number[] = [];

  override onEvict(oldValue: number): void {
    this.evictedValues.push(oldValue);
  }
}

class PushAudit extends SampleBuffer {
  readonly pushLog: Array<{ value: number; evicted: boolean }> = [];

  override onPush(value: number, evicted: boolean): void {
    this.pushLog.push({ evicted, value });
  }
}

class ClearCounter extends SampleBuffer {
  clearCount = 0;

  override onClear(): void {
    this.clearCount++;
  }
}

class PercentileAudit extends SampleBuffer {
  readonly percentileLog: Array<{ pct: number; result: number }> = [];

  override onPercentile(pct: number, result: number): void {
    this.percentileLog.push({ pct, result });
  }
}

// ── onEvict scenarios ─────────────────────────────────────────────────────────

const onEvictScenarios: Array<{
  description: string;
  capacity: number;
  pushItems: number[];
  expectedEvictedValues: number[];
}> = [
  {
    description: 'onEvict is not called when buffer is not full',
    capacity: 5,
    pushItems: [1, 2, 3],
    expectedEvictedValues: [],
  },
  {
    description: 'onEvict is called with the overwritten value when buffer is full',
    capacity: 3,
    pushItems: [100, 200, 300, 400],
    expectedEvictedValues: [100],
  },
  {
    description: 'onEvict receives values in FIFO eviction order',
    capacity: 3,
    pushItems: [10, 20, 30, 40, 50, 60],
    expectedEvictedValues: [10, 20, 30],
  },
];

for (const { description, capacity, pushItems, expectedEvictedValues } of onEvictScenarios) {
  it(description, () => {
    const buf = EvictTracker.create({ capacity });
    for (const v of pushItems) buf.push(v);
    assert.deepStrictEqual(buf.evictedValues, expectedEvictedValues);
  });
}

// ── onEvict — timing (inline subclass, must stay flat) ───────────────────────

it('onEvict is called before the value is overwritten (oldValue is still the evicted value)', () => {
  let capturedOldValue = -1;

  class CaptureEvict extends SampleBuffer {
    override onEvict(oldValue: number): void {
      capturedOldValue = oldValue;
    }
  }

  const buf = CaptureEvict.create({ capacity: 2 });
  buf.push(77);
  buf.push(88); // full
  buf.push(99); // evicts 77

  assert.equal(capturedOldValue, 77);
});

// ── onPush scenarios ──────────────────────────────────────────────────────────

const onPushScenarios: Array<{
  description: string;
  capacity: number;
  pushItems: number[];
  expectedPushLog: Array<{ value: number; evicted: boolean }>;
}> = [
  {
    description: 'onPush is called with evicted=false when buffer is not full',
    capacity: 5,
    pushItems: [42, 43],
    expectedPushLog: [
      { value: 42, evicted: false },
      { value: 43, evicted: false },
    ],
  },
  {
    description: 'onPush is called with evicted=true when buffer was full',
    capacity: 2,
    pushItems: [1, 2, 3],
    expectedPushLog: [
      { value: 1, evicted: false },
      { value: 2, evicted: false },
      { value: 3, evicted: true },
    ],
  },
  {
    description: 'onPush receives the pushed value',
    capacity: 3,
    pushItems: [100],
    expectedPushLog: [{ value: 100, evicted: false }],
  },
];

for (const { description, capacity, pushItems, expectedPushLog } of onPushScenarios) {
  it(description, () => {
    const buf = PushAudit.create({ capacity });
    for (const v of pushItems) buf.push(v);
    assert.deepStrictEqual(buf.pushLog, expectedPushLog);
  });
}

// ── onPush — timing (inline subclass, must stay flat) ────────────────────────

it('onPush is called at end of push (length is updated when hook fires)', () => {
  let lengthAtHook = -1;

  class CheckLength extends SampleBuffer {
    override onPush(_value: number, _evicted: boolean): void {
      lengthAtHook = this.count;
    }
  }

  const buf = CheckLength.create({ capacity: 5 });
  buf.push(99);

  assert.equal(lengthAtHook, 1);
});

// ── onClear scenarios ─────────────────────────────────────────────────────────

const onClearScenarios: Array<{
  description: string;
  pushItems: number[];
  clearTimes: number;
  expectedClearCount: number;
}> = [
  {
    description: 'onClear is called once per clear() invocation',
    pushItems: [1],
    clearTimes: 1,
    expectedClearCount: 1,
  },
  {
    description: 'onClear is called on each of multiple clear() calls',
    pushItems: [1, 2],
    clearTimes: 2,
    expectedClearCount: 2,
  },
  {
    description: 'onClear is called even on an empty buffer',
    pushItems: [],
    clearTimes: 1,
    expectedClearCount: 1,
  },
];

for (const { description, pushItems, clearTimes, expectedClearCount } of onClearScenarios) {
  it(description, () => {
    const buf = ClearCounter.create({ capacity: 5 });
    for (const v of pushItems) buf.push(v);
    for (let i = 0; i < clearTimes; i++) buf.clear();
    assert.equal(buf.clearCount, expectedClearCount);
  });
}

// ── onClear — timing (inline subclass, must stay flat) ───────────────────────

it('onClear is called before state is reset (length is still non-zero in hook)', () => {
  let lengthAtHook = -1;

  class CheckClear extends SampleBuffer {
    override onClear(): void {
      lengthAtHook = this.count;
    }
  }

  const buf = CheckClear.create({ capacity: 5 });
  buf.push(1);
  buf.push(2);
  buf.clear();

  assert.equal(lengthAtHook, 2);
});

// ── onPercentile scenarios ────────────────────────────────────────────────────

it('onPercentile is called with the pct and result', () => {
  const buf = PercentileAudit.create({ capacity: 10 });
  buf.push(10);
  buf.push(20);
  buf.push(30);
  buf.percentile(50);

  assert.equal(buf.percentileLog.length, 1);
  assert.equal(buf.percentileLog[0]?.pct, 50);
  assert.ok(typeof buf.percentileLog[0]?.result === 'number');
});

it('onPercentile is not called when buffer is empty', () => {
  const buf = PercentileAudit.create({ capacity: 5 });
  buf.percentile(50); // returns undefined — hook must not fire

  assert.equal(buf.percentileLog.length, 0);
});

it('onPercentile result matches return value', () => {
  const buf = PercentileAudit.create({ capacity: 5 });
  buf.push(10);
  buf.push(20);
  buf.push(30);
  const returned = buf.percentile(50);

  assert.ok(returned !== undefined);
  assert.equal(buf.percentileLog[0]?.result, returned);
});

it('onPercentile is called for p0 and p100 edge cases', () => {
  const buf = PercentileAudit.create({ capacity: 5 });
  buf.push(5);
  buf.push(15);
  buf.percentile(0);
  buf.percentile(100);

  assert.equal(buf.percentileLog.length, 2);
  assert.equal(buf.percentileLog[0]?.pct, 0);
  assert.equal(buf.percentileLog[1]?.pct, 100);
});

// ── onOverflow scenarios ─────────────────────────────────────────────────────

class OverflowTracker extends SampleBuffer {
  readonly overflowValues: number[] = [];

  override onOverflow(value: number): void {
    this.overflowValues.push(value);
  }
}

it('onOverflow is not called when buffer is not full', () => {
  const buf = OverflowTracker.create({ 'capacity': 3 });
  buf.push(1);
  buf.push(2);
  assert.equal(buf.overflowValues.length, 0);
});

it('onOverflow is called when buffer is full', () => {
  const buf = OverflowTracker.create({ 'capacity': 3 });
  buf.push(1);
  buf.push(2);
  buf.push(3);
  buf.push(4); // overflow
  assert.equal(buf.overflowValues.length, 1);
  assert.equal(buf.overflowValues[0], 4);
});

it('onOverflow is called before onEvict', () => {
  class OverflowEvictOrder extends SampleBuffer {
    readonly events: string[] = [];

    override onOverflow(value: number): void {
      this.events.push(`overflow:${String(value)}`);
    }

    override onEvict(oldValue: number): void {
      this.events.push(`evict:${String(oldValue)}`);
    }
  }

  const buf = OverflowEvictOrder.create({ 'capacity': 2 });
  buf.push(10);
  buf.push(20);
  buf.push(30); // overflow evicts 10
  assert.deepStrictEqual(buf.events, ['overflow:30', 'evict:10']);
});

it('onOverflow receives the incoming value (not the evicted value)', () => {
  const buf = OverflowTracker.create({ 'capacity': 2 });
  buf.push(10);
  buf.push(20);
  buf.push(30); // overflow, incoming=30, evicted=10
  assert.equal(buf.overflowValues[0], 30);
});

// ── onComputeStart / onComputeComplete scenarios ──────────────────────────────

class ComputeAudit extends SampleBuffer {
  readonly computeStartLengths: number[] = [];
  readonly computeCompletes: Array<{ 'length': number; 'sorted': readonly number[] }> = [];

  override onComputeStart(length: number): void {
    this.computeStartLengths.push(length);
  }

  override onComputeComplete(length: number, sorted: readonly number[]): void {
    this.computeCompletes.push({ 'length': length, 'sorted': sorted });
  }
}

class ThrowingPushBuffer extends SampleBuffer {
  override onPush(): void {
    throw new Error('onPush boom');
  }
}

class ThrowingOverflowBuffer extends SampleBuffer {
  override onOverflow(): void {
    throw new Error('onOverflow boom');
  }
}

class ThrowingEvictBuffer extends SampleBuffer {
  override onEvict(): void {
    throw new Error('onEvict boom');
  }
}

class ThrowingClearBuffer extends SampleBuffer {
  override onClear(): void {
    throw new Error('onClear boom');
  }
}

class ThrowingPercentileBuffer extends SampleBuffer {
  override onPercentile(): void {
    throw new Error('onPercentile boom');
  }
}

class ThrowingComputeBuffer extends SampleBuffer {
  override onComputeStart(): void {
    throw new Error('onComputeStart boom');
  }
}

it('onComputeStart is not called when buffer is empty', () => {
  const buf = ComputeAudit.create({ 'capacity': 5 });
  buf.percentile(50);
  assert.equal(buf.computeStartLengths.length, 0);
});

it('onComputeStart fires once per cache miss', () => {
  const buf = ComputeAudit.create({ 'capacity': 5 });
  buf.push(1);
  buf.push(2);
  buf.push(3);
  buf.percentile(50);
  buf.percentile(50); // cache hit — no second compute
  assert.equal(buf.computeStartLengths.length, 1);
});

it('onComputeStart receives the current sample count', () => {
  const buf = ComputeAudit.create({ 'capacity': 5 });
  buf.push(1);
  buf.push(2);
  buf.push(3);
  buf.percentile(50);
  assert.equal(buf.computeStartLengths[0], 3);
});

it('onComputeComplete fires once per cache miss with sorted result', () => {
  const buf = ComputeAudit.create({ 'capacity': 5 });
  buf.push(30);
  buf.push(10);
  buf.push(20);
  buf.percentile(50);
  assert.equal(buf.computeCompletes.length, 1);
  assert.deepStrictEqual(buf.computeCompletes[0]?.sorted, [10, 20, 30]);
});

it('onComputeComplete is not called when buffer is empty', () => {
  const buf = ComputeAudit.create({ 'capacity': 5 });
  buf.percentile(50);
  assert.equal(buf.computeCompletes.length, 0);
});

it('onComputeStart fires again after cache is invalidated by push', () => {
  const buf = ComputeAudit.create({ 'capacity': 5 });
  buf.push(1);
  buf.push(2);
  buf.push(3);
  buf.percentile(50); // cache miss — fires
  buf.push(4);        // invalidates cache
  buf.percentile(50); // cache miss again — fires
  assert.equal(buf.computeStartLengths.length, 2);
});

// ── Protected field access ────────────────────────────────────────────────────

it('subclass can read count, capacity, head, sortedCache', () => {
  class InspectBuffer extends SampleBuffer {
    inspect(): { capacity: number; head: number; length: number; cacheNull: boolean } {
      return {
        cacheNull: this.sortedCache === null,
        capacity: this.capacity,
        head: this.head,
        length: this.count,
      };
    }
  }

  const buf = InspectBuffer.create({ capacity: 4 });
  buf.push(1);
  buf.push(2);

  const state = buf.inspect();
  assert.equal(state.length, 2);
  assert.equal(state.capacity, 4);
  assert.equal(state.head, 0);
  assert.equal(state.cacheNull, true); // invalidated by push
});

// A hook that throws now surfaces a `HookInvocationError` from the method
// that fired it, instead of being silently swallowed.

it('a throwing onPush hook raises HookInvocationError but the append already completed', () => {
  const buf = ThrowingPushBuffer.create({ 'capacity': 3 });

  assert.throws(() => {
    buf.push(10);
  }, HookInvocationError);

  // onPush fires after the append — the mutation is already committed.
  assert.equal(buf.length, 1);
  assert.equal(buf.percentile(50), 10);
});

it('a throwing onOverflow hook raises HookInvocationError and prevents the overwrite', () => {
  const buf = ThrowingOverflowBuffer.create({ 'capacity': 2 });
  buf.push(10);
  buf.push(20);

  assert.throws(() => {
    buf.push(30);
  }, HookInvocationError);

  // onOverflow fires before eviction — the overwrite never happens.
  assert.equal(buf.length, 2);
  assert.equal(buf.percentile(0), 10);
  assert.equal(buf.percentile(100), 20);
});

it('a throwing onEvict hook raises HookInvocationError and prevents the overwrite', () => {
  const buf = ThrowingEvictBuffer.create({ 'capacity': 2 });
  buf.push(10);
  buf.push(20);

  assert.throws(() => {
    buf.push(30);
  }, HookInvocationError);

  // onEvict fires before the slot is overwritten — the overwrite never happens.
  assert.equal(buf.length, 2);
  assert.equal(buf.percentile(0), 10);
  assert.equal(buf.percentile(100), 20);
});

it('a throwing onClear hook raises HookInvocationError and prevents the reset', () => {
  const buf = ThrowingClearBuffer.create({ 'capacity': 3 });
  buf.push(1);
  buf.push(2);

  assert.throws(() => {
    buf.clear();
  }, HookInvocationError);

  // onClear fires before state is reset — the reset never happens.
  assert.equal(buf.length, 2);
  assert.equal(buf.percentile(50), 1.5);
});

it('a throwing onPercentile hook raises HookInvocationError instead of returning the computed result', () => {
  const buf = ThrowingPercentileBuffer.create({ 'capacity': 3 });
  buf.push(10);
  buf.push(20);
  buf.push(30);

  assert.throws(() => {
    buf.percentile(50);
  }, HookInvocationError);
});

it('a throwing onComputeStart hook raises HookInvocationError instead of computing the percentile', () => {
  const buf = ThrowingComputeBuffer.create({ 'capacity': 3 });
  buf.push(30);
  buf.push(10);
  buf.push(20);

  assert.throws(() => {
    buf.percentile(50);
  }, HookInvocationError);
});

it('HookInvocationError carries the failing hook name and original cause', () => {
  const buf = ThrowingPushBuffer.create({ 'capacity': 3 });

  try {
    buf.push(10);
    assert.fail('expected push() to throw');
  } catch (error) {
    assert.ok(error instanceof HookInvocationError);
    assert.equal(error.hookName, 'onPush');
    assert.ok(error.cause instanceof Error);
    assert.equal((error.cause as Error).message, 'onPush boom');
  }
});

// ── Async hook override safety net ───────────────────────────────────────────
//
// Every synchronous fire point returns the protected hook result to
// HookInvoker so an unexpected asynchronous override remains guarded.

class AsyncRejectingPushBuffer extends SampleBuffer {
  override async onPush(_value: number, _evicted: boolean): Promise<void> {
    await Promise.resolve();
    throw new Error('async onPush failure');
  }
}

class AsyncRejectingPercentileBuffer extends SampleBuffer {
  override async onPercentile(_pct: number, _result: number): Promise<void> {
    await Promise.resolve();
    throw new Error('async onPercentile failure');
  }
}

it('an async-rejecting onPush override is routed safely with no unhandled rejection, even though push() never awaits the hook', async () => {
  const buf = AsyncRejectingPushBuffer.create({ 'capacity': 1 });
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => {
    rejectionEvents.push(reason);
  };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    buf.push(10);
    buf.push(20);

    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });

    assert.equal(rejectionEvents.length, 0);
    assert.equal(buf.length, 1);
    assert.equal(buf.percentile(50), 20);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

it('async-rejecting onPercentile overrides stay guarded across edge, exact-rank, and interpolated results', async () => {
  const buf = AsyncRejectingPercentileBuffer.create({ 'capacity': 3 });
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => {
    rejectionEvents.push(reason);
  };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    buf.push(10);
    buf.push(20);
    buf.push(30);

    assert.equal(buf.percentile(0), 10);
    assert.equal(buf.percentile(100), 30);
    assert.equal(buf.percentile(50), 20);
    assert.equal(buf.percentile(25), 15);

    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });

    assert.equal(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});
