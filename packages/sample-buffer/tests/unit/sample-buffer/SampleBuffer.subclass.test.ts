/**
 * Subclass extension tests for SampleBuffer
 *
 * Verifies that the protected seams (fields + hooks) are reachable and
 * overridable by a consumer subclass.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

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

// ── Tests ────────────────────────────────────────────────────────────────────

void describe('SampleBuffer subclass extension', () => {
  void describe('onEvict hook', () => {
    void it('is not called when buffer is not full', () => {
      const buf = new EvictTracker(5);
      buf.push(1);
      buf.push(2);
      buf.push(3);

      assert.strictEqual(buf.evictedValues.length, 0);
    });

    void it('is called when buffer is full and an item is overwritten', () => {
      const buf = new EvictTracker(3);
      buf.push(100);
      buf.push(200);
      buf.push(300); // full
      buf.push(400); // evicts 100

      assert.strictEqual(buf.evictedValues.length, 1);
      assert.strictEqual(buf.evictedValues[0], 100);
    });

    void it('receives the value being overwritten (FIFO eviction order)', () => {
      const buf = new EvictTracker(3);
      buf.push(10);
      buf.push(20);
      buf.push(30);
      buf.push(40); // evicts 10
      buf.push(50); // evicts 20
      buf.push(60); // evicts 30

      assert.deepStrictEqual(buf.evictedValues, [10, 20, 30]);
    });

    void it('is called before the value is overwritten (oldValue is still the evicted value)', () => {
      let capturedOldValue = -1;

      class CaptureEvict extends SampleBuffer {
        override onEvict(oldValue: number): void {
          capturedOldValue = oldValue;
        }
      }

      const buf = new CaptureEvict(2);
      buf.push(77);
      buf.push(88); // full
      buf.push(99); // evicts 77

      assert.strictEqual(capturedOldValue, 77);
    });
  });

  void describe('onPush hook', () => {
    void it('is called with evicted=false when buffer is not full', () => {
      const buf = new PushAudit(5);
      buf.push(42);
      buf.push(43);

      assert.strictEqual(buf.pushLog.length, 2);
      assert.strictEqual(buf.pushLog[0]?.evicted, false);
      assert.strictEqual(buf.pushLog[1]?.evicted, false);
    });

    void it('is called with evicted=true when buffer was full', () => {
      const buf = new PushAudit(2);
      buf.push(1);
      buf.push(2); // fills
      buf.push(3); // evicts

      assert.strictEqual(buf.pushLog[2]?.evicted, true);
    });

    void it('receives the pushed value', () => {
      const buf = new PushAudit(3);
      buf.push(100);

      assert.strictEqual(buf.pushLog[0]?.value, 100);
    });

    void it('is called at end of push (length is updated)', () => {
      let lengthAtHook = -1;

      class CheckLength extends SampleBuffer {
        override onPush(_value: number, _evicted: boolean): void {
          lengthAtHook = this._length;
        }
      }

      const buf = new CheckLength(5);
      buf.push(99);

      assert.strictEqual(lengthAtHook, 1);
    });
  });

  void describe('onClear hook', () => {
    void it('is called each time clear() is invoked', () => {
      const buf = new ClearCounter(5);
      buf.push(1);
      buf.clear();
      buf.push(2);
      buf.clear();

      assert.strictEqual(buf.clearCount, 2);
    });

    void it('is called before state is reset (length is still non-zero in hook)', () => {
      let lengthAtHook = -1;

      class CheckClear extends SampleBuffer {
        override onClear(): void {
          lengthAtHook = this._length;
        }
      }

      const buf = new CheckClear(5);
      buf.push(1);
      buf.push(2);
      buf.clear();

      assert.strictEqual(lengthAtHook, 2);
    });

    void it('is called even on an empty buffer', () => {
      const buf = new ClearCounter(5);
      buf.clear();

      assert.strictEqual(buf.clearCount, 1);
    });
  });

  void describe('onPercentile hook', () => {
    void it('is called with the pct and result', () => {
      const buf = new PercentileAudit(10);
      buf.push(10);
      buf.push(20);
      buf.push(30);
      buf.percentile(50);

      assert.strictEqual(buf.percentileLog.length, 1);
      assert.strictEqual(buf.percentileLog[0]?.pct, 50);
      assert.ok(typeof buf.percentileLog[0]?.result === 'number');
    });

    void it('is not called when buffer is empty', () => {
      const buf = new PercentileAudit(5);
      buf.percentile(50); // returns undefined — hook must not fire

      assert.strictEqual(buf.percentileLog.length, 0);
    });

    void it('result in hook matches return value', () => {
      const buf = new PercentileAudit(5);
      buf.push(10);
      buf.push(20);
      buf.push(30);
      const returned = buf.percentile(50);

      assert.ok(returned !== undefined);
      assert.strictEqual(buf.percentileLog[0]?.result, returned);
    });

    void it('is called for p0 and p100 edge cases', () => {
      const buf = new PercentileAudit(5);
      buf.push(5);
      buf.push(15);
      buf.percentile(0);
      buf.percentile(100);

      assert.strictEqual(buf.percentileLog.length, 2);
      assert.strictEqual(buf.percentileLog[0]?.pct, 0);
      assert.strictEqual(buf.percentileLog[1]?.pct, 100);
    });
  });

  void describe('protected field access from subclass', () => {
    void it('subclass can read _length, _capacity, _head, _samples, _sortedCache', () => {
      class InspectBuffer extends SampleBuffer {
        inspect(): { capacity: number; head: number; length: number; cacheNull: boolean } {
          return {
            cacheNull: this._sortedCache === null,
            capacity: this._capacity,
            head: this._head,
            length: this._length,
          };
        }
      }

      const buf = new InspectBuffer(4);
      buf.push(1);
      buf.push(2);

      const state = buf.inspect();
      assert.strictEqual(state.length, 2);
      assert.strictEqual(state.capacity, 4);
      assert.strictEqual(state.head, 0);
      assert.strictEqual(state.cacheNull, true); // invalidated by push
    });
  });
});
