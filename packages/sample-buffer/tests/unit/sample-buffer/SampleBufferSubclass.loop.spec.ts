import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import { SampleBuffer } from '../../../src/sample-buffer/SampleBuffer.js';
import scenarioGroups from './SampleBufferSubclass.scenarios.json';

type ScenarioCase =
  {
    description: string;
    expected: Record<string, unknown>;
    input: { sampleBuffer: { capacity: number } } & Record<string, unknown>;
    kind:
      | 'on-evict'
      | 'on-evict-before-overwrite'
      | 'on-push'
      | 'on-push-length-update'
      | 'on-clear'
      | 'on-clear-before-reset'
      | 'on-percentile-called'
      | 'on-percentile-absent-when-empty'
      | 'on-percentile-result-matches-return'
      | 'on-percentile-edge-cases'
      | 'on-overflow-not-full'
      | 'on-overflow-full'
      | 'on-overflow-before-on-evict'
      | 'on-overflow-incoming-value'
      | 'on-compute-start-empty'
      | 'on-compute-start-cache-miss'
      | 'on-compute-start-length'
      | 'on-compute-complete-sorted'
      | 'on-compute-complete-empty'
      | 'on-compute-start-after-invalidation'
      | 'inspect-protected-fields'
      | 'throwing-on-push'
      | 'throwing-on-overflow'
      | 'throwing-on-evict'
      | 'throwing-on-clear'
      | 'throwing-on-percentile'
      | 'throwing-on-compute-start'
      | 'hook-invocation-error-cause'
      | 'async-push-rejection-safe'
      | 'async-percentile-rejection-safe';
    name: string;
  };

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
  override onClear(): void { this.clearCount += 1; }
}

class PercentileAudit extends SampleBuffer {
  readonly percentileLog: Array<{ pct: number; result: number }> = [];
  override onPercentile(pct: number, result: number): void {
    this.percentileLog.push({ pct, result });
  }
}

class OverflowTracker extends SampleBuffer {
  readonly overflowValues: number[] = [];
  override onOverflow(value: number): void {
    this.overflowValues.push(value);
  }
}

class ComputeAudit extends SampleBuffer {
  readonly computeStartLengths: number[] = [];
  readonly computeCompletes: Array<{ length: number; sorted: readonly number[] }> = [];

  override onComputeStart(length: number): void {
    this.computeStartLengths.push(length);
  }

  override onComputeComplete(length: number, sorted: readonly number[]): void {
    this.computeCompletes.push({ length, sorted });
  }
}

class ThrowingPushBuffer extends SampleBuffer { override onPush(): void { throw new Error('onPush boom'); } }
class ThrowingOverflowBuffer extends SampleBuffer { override onOverflow(): void { throw new Error('onOverflow boom'); } }
class ThrowingEvictBuffer extends SampleBuffer { override onEvict(): void { throw new Error('onEvict boom'); } }
class ThrowingClearBuffer extends SampleBuffer { override onClear(): void { throw new Error('onClear boom'); } }
class ThrowingPercentileBuffer extends SampleBuffer { override onPercentile(): void { throw new Error('onPercentile boom'); } }
class ThrowingComputeBuffer extends SampleBuffer { override onComputeStart(): void { throw new Error('onComputeStart boom'); } }

type ScenarioKind = ScenarioCase['kind'];
type RunnerResult = Promise<void> | void;
type RunnerMap = { [K in ScenarioKind]: (scenarioCase: ScenarioCase & { kind: K }) => RunnerResult };

const runnerMap: RunnerMap = {
  'on-evict': (scenarioCase) => {
    const input = scenarioCase.input as { pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { evictedValues: number[] };
    const buf = EvictTracker.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    assert.deepStrictEqual(buf.evictedValues, expected.evictedValues);
    return;
  },

  'on-evict-before-overwrite': (scenarioCase) => {
    let capturedOldValue = -1;

    class CaptureEvict extends SampleBuffer {
      override onEvict(oldValue: number): void {
        capturedOldValue = oldValue;
      }
    }

    const input = scenarioCase.input as { sampleBuffer: { capacity: number }; values: number[] };
    const expected = scenarioCase.expected as { capturedOldValue: number };
    const buf = CaptureEvict.create(input.sampleBuffer);
    for (const value of input.values) {
      buf.push(value);
    }
    assert.equal(capturedOldValue, expected.capturedOldValue);
    return;
  },

  'on-push': (scenarioCase) => {
    const input = scenarioCase.input as { pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { pushLog: Array<{ evicted: boolean; value: number }> };
    const buf = PushAudit.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    assert.deepStrictEqual(buf.pushLog, expected.pushLog);
    return;
  },

  'on-push-length-update': (scenarioCase) => {
    const input = scenarioCase.input as { sampleBuffer: { capacity: number }; value: number };
    const expected = scenarioCase.expected as { lengthAtHook: number };
    let lengthAtHook = -1;
    class CheckLength extends SampleBuffer {
      override onPush(): void {
        lengthAtHook = this.count;
      }
    }

    const buf = CheckLength.create(input.sampleBuffer);
    buf.push(input.value);
    assert.equal(lengthAtHook, expected.lengthAtHook);
    return;
  },

  'on-clear': (scenarioCase) => {
    const input = scenarioCase.input as { clearTimes: number; pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { clearCount: number };
    const buf = ClearCounter.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    for (let i = 0; i < input.clearTimes; i += 1) {
      buf.clear();
    }
    assert.equal(buf.clearCount, expected.clearCount);
    return;
  },

  'on-clear-before-reset': (scenarioCase) => {
    const input = scenarioCase.input as { pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { lengthAtHook: number };
    let lengthAtHook = -1;
    class CheckClear extends SampleBuffer {
      override onClear(): void {
        lengthAtHook = this.count;
      }
    }

    const buf = CheckClear.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    buf.clear();
    assert.equal(lengthAtHook, expected.lengthAtHook);
    return;
  },

  'on-percentile-called': (scenarioCase) => {
    const input = scenarioCase.input as { pct: number; pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { pct: number; result: number; resultType: string };
    const buf = PercentileAudit.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    buf.percentile(input.pct);
    assert.equal(buf.percentileLog.length, 1);
    assert.equal(buf.percentileLog[0]?.pct, expected.pct);
    assert.equal(buf.percentileLog[0]?.result, expected.result);
    assert.ok(typeof buf.percentileLog[0]?.result === expected.resultType);
    return;
  },

  'on-percentile-absent-when-empty': (scenarioCase) => {
    const input = scenarioCase.input as { pct: number; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { percentileLogLength: number };
    const buf = PercentileAudit.create(input.sampleBuffer);
    buf.percentile(input.pct);
    assert.equal(buf.percentileLog.length, expected.percentileLogLength);
    return;
  },

  'on-percentile-result-matches-return': (scenarioCase) => {
    const input = scenarioCase.input as { pct: number; pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { result: number };
    const buf = PercentileAudit.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    const returned = buf.percentile(input.pct);
    assert.equal(returned, expected.result);
    assert.equal(buf.percentileLog[0]?.result, returned);
    return;
  },

  'on-percentile-edge-cases': (scenarioCase) => {
    const input = scenarioCase.input as { percentiles: number[]; pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { results: number[] };
    const buf = PercentileAudit.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    buf.percentile(input.percentiles[0]!);
    buf.percentile(input.percentiles[1]!);
    assert.equal(buf.percentileLog.length, 2);
    assert.equal(buf.percentileLog[0]?.pct, input.percentiles[0]);
    assert.equal(buf.percentileLog[1]?.pct, input.percentiles[1]);
    assert.equal(buf.percentileLog[0]?.result, expected.results[0]);
    assert.equal(buf.percentileLog[1]?.result, expected.results[1]);
    return;
  },

  'on-overflow-not-full': (scenarioCase) => {
    const input = scenarioCase.input as { pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { overflowCount: number };
    const buf = OverflowTracker.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    assert.equal(buf.overflowValues.length, expected.overflowCount);
    return;
  },

  'on-overflow-full': (scenarioCase) => {
    const input = scenarioCase.input as { pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { overflowCount: number; overflowValue: number };
    const buf = OverflowTracker.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    assert.equal(buf.overflowValues.length, expected.overflowCount);
    assert.equal(buf.overflowValues[0], expected.overflowValue);
    return;
  },

  'on-overflow-before-on-evict': (scenarioCase) => {
    class OverflowEvictOrder extends SampleBuffer {
      readonly events: string[] = [];

      override onOverflow(value: number): void {
        this.events.push(`overflow:${String(value)}`);
      }

      override onEvict(oldValue: number): void {
        this.events.push(`evict:${String(oldValue)}`);
      }
    }

    const input = scenarioCase.input as { pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { events: string[] };
    const buf = OverflowEvictOrder.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    assert.deepStrictEqual(buf.events, expected.events);
    return;
  },

  'on-overflow-incoming-value': (scenarioCase) => {
    const input = scenarioCase.input as { pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { overflowValue: number };
    const buf = OverflowTracker.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    assert.equal(buf.overflowValues[0], expected.overflowValue);
    return;
  },

  'on-compute-start-empty': (scenarioCase) => {
    const input = scenarioCase.input as { pct: number; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { computeStartLengths: number[] };
    const buf = ComputeAudit.create(input.sampleBuffer);
    buf.percentile(input.pct);
    assert.deepStrictEqual(buf.computeStartLengths, expected.computeStartLengths);
    return;
  },

  'on-compute-start-cache-miss': (scenarioCase) => {
    const input = scenarioCase.input as { calls: number; pct: number; pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { computeStartLengths: number[] };
    const buf = ComputeAudit.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    for (let i = 0; i < input.calls; i += 1) {
      buf.percentile(input.pct);
    }
    assert.deepStrictEqual(buf.computeStartLengths, expected.computeStartLengths);
    return;
  },

  'on-compute-start-length': (scenarioCase) => {
    const input = scenarioCase.input as { pct: number; pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { computeStartLength: number };
    const buf = ComputeAudit.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    buf.percentile(input.pct);
    assert.equal(buf.computeStartLengths[0], expected.computeStartLength);
    return;
  },

  'on-compute-complete-sorted': (scenarioCase) => {
    const input = scenarioCase.input as { pct: number; pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { sorted: number[] };
    const buf = ComputeAudit.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    buf.percentile(input.pct);
    assert.equal(buf.computeCompletes.length, 1);
    assert.deepStrictEqual(buf.computeCompletes[0]?.sorted, expected.sorted);
    return;
  },

  'on-compute-complete-empty': (scenarioCase) => {
    const input = scenarioCase.input as { pct: number; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { computeCompletes: [] };
    const buf = ComputeAudit.create(input.sampleBuffer);
    buf.percentile(input.pct);
    assert.deepStrictEqual(buf.computeCompletes, expected.computeCompletes);
    return;
  },

  'on-compute-start-after-invalidation': (scenarioCase) => {
    const input = scenarioCase.input as { initialPushItems: number[]; pct: number; pushAfter: number; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { computeStartCount: number };
    const buf = ComputeAudit.create(input.sampleBuffer);
    for (const value of input.initialPushItems) {
      buf.push(value);
    }
    buf.percentile(input.pct);
    buf.push(input.pushAfter);
    buf.percentile(input.pct);
    assert.equal(buf.computeStartLengths.length, expected.computeStartCount);
    return;
  },

  'inspect-protected-fields': (scenarioCase) => {
    const input = scenarioCase.input as { pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { state: { cacheNull: boolean; capacity: number; head: number; length: number } };
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

    const buf = InspectBuffer.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    const state = buf.inspect();
    assert.deepStrictEqual(state, expected.state);
    return;
  },

  'throwing-on-push': (scenarioCase) => {
    const input = scenarioCase.input as { pct: number; pushValue: number; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { length: number; percentile: number };
    const buf = ThrowingPushBuffer.create(input.sampleBuffer);
    assert.throws(() => { buf.push(input.pushValue); }, HookInvocationError);
    assert.equal(buf.length, expected.length);
    assert.equal(buf.percentile(input.pct), expected.percentile);
    return;
  },

  'throwing-on-overflow': (scenarioCase) => {
    const input = scenarioCase.input as { overflowPush: number; percentiles: number[]; primingPushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { length: number; percentiles: Record<string, number> };
    const buf = ThrowingOverflowBuffer.create(input.sampleBuffer);
    for (const value of input.primingPushItems) {
      buf.push(value);
    }
    assert.throws(() => { buf.push(input.overflowPush); }, HookInvocationError);
    assert.equal(buf.length, expected.length);
    for (const pct of input.percentiles) {
      assert.equal(buf.percentile(pct), expected.percentiles[String(pct)]);
    }
    return;
  },

  'throwing-on-evict': (scenarioCase) => {
    const input = scenarioCase.input as { overflowPush: number; percentiles: number[]; primingPushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { length: number; percentiles: Record<string, number> };
    const buf = ThrowingEvictBuffer.create(input.sampleBuffer);
    for (const value of input.primingPushItems) {
      buf.push(value);
    }
    assert.throws(() => { buf.push(input.overflowPush); }, HookInvocationError);
    assert.equal(buf.length, expected.length);
    for (const pct of input.percentiles) {
      assert.equal(buf.percentile(pct), expected.percentiles[String(pct)]);
    }
    return;
  },

  'throwing-on-clear': (scenarioCase) => {
    const input = scenarioCase.input as { pct: number; pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { length: number; percentile: number };
    const buf = ThrowingClearBuffer.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    assert.throws(() => { buf.clear(); }, HookInvocationError);
    assert.equal(buf.length, expected.length);
    assert.equal(buf.percentile(input.pct), expected.percentile);
    return;
  },

  'throwing-on-percentile': (scenarioCase) => {
    const input = scenarioCase.input as { pct: number; pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { errorName: string };
    const buf = ThrowingPercentileBuffer.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    assert.throws(() => { buf.percentile(input.pct); }, (error: unknown) => {
      assert.ok(error instanceof HookInvocationError);
      assert.equal(error.constructor.name, expected.errorName);
      return true;
    });
    return;
  },

  'throwing-on-compute-start': (scenarioCase) => {
    const input = scenarioCase.input as { pct: number; pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { errorName: string };
    const buf = ThrowingComputeBuffer.create(input.sampleBuffer);
    for (const value of input.pushItems) {
      buf.push(value);
    }
    assert.throws(() => { buf.percentile(input.pct); }, (error: unknown) => {
      assert.ok(error instanceof HookInvocationError);
      assert.equal(error.constructor.name, expected.errorName);
      return true;
    });
    return;
  },

  'hook-invocation-error-cause': (scenarioCase) => {
    const input = scenarioCase.input as { pushValue: number; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { causeMessage: string; hookName: string };
    const buf = ThrowingPushBuffer.create(input.sampleBuffer);
    try {
      buf.push(input.pushValue);
      assert.fail('expected push() to throw');
    } catch (error) {
      assert.ok(error instanceof HookInvocationError);
      assert.equal(error.hookName, expected.hookName);
      assert.ok(error.cause instanceof Error);
      assert.equal((error.cause as Error).message, expected.causeMessage);
    }
    return;
  },

  'async-push-rejection-safe': (scenarioCase) => {
    class AsyncRejectingPushBuffer extends SampleBuffer {
      override async onPush(_value: number, _evicted: boolean): Promise<void> {
        await Promise.resolve();
        throw new Error('async onPush failure');
      }
    }

    const input = scenarioCase.input as { pct: number; pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { length: number; percentile: number; rejectionCount: number };
    const buf = AsyncRejectingPushBuffer.create(input.sampleBuffer);
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    return Promise.resolve()
      .then(() => {
        for (const value of input.pushItems) {
          buf.push(value);
        }
      })
      .then(() => new Promise((resolve) => { setImmediate(resolve); }))
      .then(() => new Promise((resolve) => { setImmediate(resolve); }))
      .then(() => {
        assert.equal(rejectionEvents.length, expected.rejectionCount);
        assert.equal(buf.length, expected.length);
        assert.equal(buf.percentile(input.pct), expected.percentile);
      })
      .finally(() => {
        process.off('unhandledRejection', onUnhandledRejection);
      });
  },

  'async-percentile-rejection-safe': (scenarioCase) => {
    class AsyncRejectingPercentileBuffer extends SampleBuffer {
      override async onPercentile(_pct: number, _result: number): Promise<void> {
        await Promise.resolve();
        throw new Error('async onPercentile failure');
      }
    }

    const input = scenarioCase.input as { percentiles: number[]; pushItems: number[]; sampleBuffer: { capacity: number } };
    const expected = scenarioCase.expected as { rejectionCount: number; results: Record<string, number> };
    const buf = AsyncRejectingPercentileBuffer.create(input.sampleBuffer);
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    return Promise.resolve()
      .then(() => {
        for (const value of input.pushItems) {
          buf.push(value);
        }
        for (const pct of input.percentiles) {
          assert.equal(buf.percentile(pct), expected.results[String(pct)]);
        }
      })
      .then(() => new Promise((resolve) => { setImmediate(resolve); }))
      .then(() => new Promise((resolve) => { setImmediate(resolve); }))
      .then(() => {
        assert.equal(rejectionEvents.length, expected.rejectionCount);
      })
      .finally(() => {
        process.off('unhandledRejection', onUnhandledRejection);
      });
  }
};

function dispatchCase<K extends ScenarioKind>(kind: K, scenarioCase: ScenarioCase & { kind: K }): RunnerResult {
  return runnerMap[kind](scenarioCase);
}

function runCase<K extends ScenarioKind>(scenarioCase: ScenarioCase & { kind: K }): RunnerResult {
  return dispatchCase(scenarioCase.kind, scenarioCase);
}

void describe('SampleBuffer subclass extension', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
