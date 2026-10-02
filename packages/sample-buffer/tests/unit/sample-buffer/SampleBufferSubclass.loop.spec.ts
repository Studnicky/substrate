import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import { SampleBuffer } from '../../../src/sample-buffer/SampleBuffer.js';
import { SampleBufferSubclassScenarioCaseEntity } from '../entities/SampleBufferSubclassScenarioCaseEntity.js';
import scenarioGroups from './SampleBufferSubclass.scenarios.json' with { 'type': 'json' };

class EvictTracker extends SampleBuffer {
  readonly evictedValues: number[] = [];

  static override create(options: Parameters<typeof SampleBuffer.create>[0]): EvictTracker {
    return new EvictTracker(options);
  }

  override onEvict(oldValue: number): void {
    this.evictedValues.push(oldValue);
  }
}

class PushAudit extends SampleBuffer {
  readonly pushLog: { 'evicted': boolean; 'value': number; }[] = [];

  static override create(options: Parameters<typeof SampleBuffer.create>[0]): PushAudit {
    return new PushAudit(options);
  }

  override onPush(value: number, evicted: boolean): void {
    this.pushLog.push({ 'evicted': evicted, 'value': value });
  }
}

class ClearCounter extends SampleBuffer {
  clearCount = 0;

  static override create(options: Parameters<typeof SampleBuffer.create>[0]): ClearCounter {
    return new ClearCounter(options);
  }
  override onClear(): void {
    this.clearCount += 1;
  }
}

class PercentileAudit extends SampleBuffer {
  readonly percentileLog: { 'pct': number; 'result': number }[] = [];

  static override create(options: Parameters<typeof SampleBuffer.create>[0]): PercentileAudit {
    return new PercentileAudit(options);
  }
  override onPercentile(pct: number, result: number): void {
    this.percentileLog.push({ 'pct': pct, 'result': result });
  }
}

class OverflowTracker extends SampleBuffer {
  readonly overflowValues: number[] = [];

  static override create(options: Parameters<typeof SampleBuffer.create>[0]): OverflowTracker {
    return new OverflowTracker(options);
  }
  override onOverflow(value: number): void {
    this.overflowValues.push(value);
  }
}

class ComputeAudit extends SampleBuffer {
  readonly computeStartLengths: number[] = [];

  static override create(options: Parameters<typeof SampleBuffer.create>[0]): ComputeAudit {
    return new ComputeAudit(options);
  }
  readonly computeCompletes: {
    'length': number;
    'sorted': readonly number[];
  }[] = [];

  override onComputeStart(length: number): void {
    this.computeStartLengths.push(length);
  }

  override onComputeComplete(length: number, sorted: readonly number[]): void {
    this.computeCompletes.push({ 'length': length, 'sorted': sorted });
  }
}

class ThrowingPushBuffer extends SampleBuffer {
  override onPush(): void {
    throw RuntimeError.create('onPush boom');
  }
}
class ThrowingOverflowBuffer extends SampleBuffer {
  override onOverflow(): void {
    throw RuntimeError.create('onOverflow boom');
  }
}
class ThrowingEvictBuffer extends SampleBuffer {
  override onEvict(): void {
    throw RuntimeError.create('onEvict boom');
  }
}
class ThrowingClearBuffer extends SampleBuffer {
  override onClear(): void {
    throw RuntimeError.create('onClear boom');
  }
}
class ThrowingPercentileBuffer extends SampleBuffer {
  override onPercentile(): void {
    throw RuntimeError.create('onPercentile boom');
  }
}
class ThrowingComputeBuffer extends SampleBuffer {
  override onComputeStart(): void {
    throw RuntimeError.create('onComputeStart boom');
  }
}

class UnexpectedPercentileError extends BaseError {
  public override readonly name: string = 'UnexpectedPercentileError';

  public constructor(percentile: number) {
    super({
      'code': 'sampleBuffer.testUnexpectedPercentile',
      'message': `unexpected percentile key: ${String(percentile)}`,
      'retryable': false
    });
  }
}

class SampleBufferSubclassRunners {
  static async 'async-percentile-rejection-safe'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'async-percentile-rejection-safe'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const buffer = SampleBuffer.create(input.sampleBuffer);
    Object.assign(buffer, {
      'onPercentile': () => {
        const pending = SampleBufferSubclassRunners.rejectAfterTick('async onPercentile failure');
        return pending;
      }
    });
    let unhandledRejectionCount = 0;
    const onUnhandledRejection = (): void => {
      unhandledRejectionCount += 1;
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
      const percentiles = input.percentiles;
      for (let index = 0; index < percentiles.length; index += 1) {
        const percentile = Number(percentiles[index]);
        assert.equal(buffer.percentile(percentile), SampleBufferSubclassRunners.percentileAtQuartile(expected.results, percentile));
      }
      await SampleBufferSubclassRunners.flushImmediate();
      await SampleBufferSubclassRunners.flushImmediate();
      assert.equal(unhandledRejectionCount, expected.rejectionCount);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'async-push-rejection-safe'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'async-push-rejection-safe'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const buffer = SampleBuffer.create(input.sampleBuffer);
    Object.assign(buffer, {
      'onPush': () => {
        const pending = SampleBufferSubclassRunners.rejectAfterTick('async onPush failure');
        return pending;
      }
    });
    let unhandledRejectionCount = 0;
    const onUnhandledRejection = (): void => {
      unhandledRejectionCount += 1;
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
      await SampleBufferSubclassRunners.flushImmediate();
      await SampleBufferSubclassRunners.flushImmediate();
      assert.equal(unhandledRejectionCount, expected.rejectionCount);
      assert.equal(buffer.length, expected.length);
      assert.equal(buffer.percentile(input.pct), expected.percentile);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static 'hook-invocation-error-cause'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'hook-invocation-error-cause'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ThrowingPushBuffer.create(input.sampleBuffer);
    try {
      buffer.push(input.pushValue);
      assert.fail('expected push() to throw');
    } catch (thrown) {
      const error: unknown = thrown;
      assert.ok(error instanceof HookInvocationError);
      assert.equal(error.hookName, expected.hookName);
      const { cause } = error;
      assert.ok(cause instanceof Error);
      assert.equal(cause.message, expected.causeMessage);
    }
  }

  static 'inspect-protected-fields'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'inspect-protected-fields'>): void {
    const { expected, input } = scenarioCase;
    class InspectBuffer extends SampleBuffer {
      static override create(options: Parameters<typeof SampleBuffer.create>[0]): InspectBuffer {
        return new InspectBuffer(options);
      }
      inspect(): {
        'cacheNull': boolean;
        'capacity': number;
        'head': number;
        'length': number;
      } {
        return {
          'cacheNull': this.sortedCache === null,
          'capacity': this.capacity,
          'head': this.head,
          'length': this.count
        };
      }
    }

    const buffer = InspectBuffer.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    const state = buffer.inspect();
    assert.deepStrictEqual(state, expected.state);
  }

  static 'on-clear'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-clear'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ClearCounter.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    for (let index = 0; index < input.clearTimes; index += 1) {
      buffer.clear();
    }
    assert.equal(buffer.clearCount, expected.clearCount);
  }

  static 'on-clear-before-reset'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-clear-before-reset'>): void {
    const { expected, input } = scenarioCase;
    let lengthAtHook = -1;
    class CheckClear extends SampleBuffer {
      override onClear(): void {
        lengthAtHook = this.count;
      }
    }

    const buffer = CheckClear.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    buffer.clear();
    assert.equal(lengthAtHook, expected.lengthAtHook);
  }

  static 'on-compute-complete-empty'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-compute-complete-empty'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ComputeAudit.create(input.sampleBuffer);
    buffer.percentile(input.pct);
    assert.deepStrictEqual(buffer.computeCompletes, expected.computeCompletes);
  }

  static 'on-compute-complete-sorted'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-compute-complete-sorted'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ComputeAudit.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    buffer.percentile(input.pct);
    assert.equal(buffer.computeCompletes.length, 1);
    assert.deepStrictEqual(buffer.computeCompletes[0]?.sorted, expected.sorted);
  }

  static 'on-compute-start-after-invalidation'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-compute-start-after-invalidation'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ComputeAudit.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.initialPushItems);
    buffer.percentile(input.pct);
    buffer.push(input.pushAfter);
    buffer.percentile(input.pct);
    assert.equal(buffer.computeStartLengths.length, expected.computeStartCount);
  }

  static 'on-compute-start-cache-miss'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-compute-start-cache-miss'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ComputeAudit.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    for (let index = 0; index < input.calls; index += 1) {
      buffer.percentile(input.pct);
    }
    assert.deepStrictEqual(
      buffer.computeStartLengths,
      expected.computeStartLengths
    );
  }

  static 'on-compute-start-empty'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-compute-start-empty'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ComputeAudit.create(input.sampleBuffer);
    buffer.percentile(input.pct);
    assert.deepStrictEqual(
      buffer.computeStartLengths,
      expected.computeStartLengths
    );
  }

  static 'on-compute-start-length'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-compute-start-length'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ComputeAudit.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    buffer.percentile(input.pct);
    assert.equal(buffer.computeStartLengths[0], expected.computeStartLength);
  }

  static 'on-evict'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-evict'>): void {
    const { expected, input } = scenarioCase;
    const buffer = EvictTracker.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    assert.deepStrictEqual(buffer.evictedValues, expected.evictedValues);
  }

  static 'on-evict-before-overwrite'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-evict-before-overwrite'>): void {
    let capturedOldValue = -1;

    class CaptureEvict extends SampleBuffer {
      override onEvict(oldValue: number): void {
        capturedOldValue = oldValue;
      }
    }

    const { expected, input } = scenarioCase;
    const buffer = CaptureEvict.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.values);
    assert.equal(capturedOldValue, expected.capturedOldValue);
  }

  static 'on-overflow-before-on-evict'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-overflow-before-on-evict'>): void {
    class OverflowEvictOrder extends SampleBuffer {
      readonly events: string[] = [];

      static override create(options: Parameters<typeof SampleBuffer.create>[0]): OverflowEvictOrder {
        return new OverflowEvictOrder(options);
      }

      override onOverflow(value: number): void {
        this.events.push(`overflow:${String(value)}`);
      }

      override onEvict(oldValue: number): void {
        this.events.push(`evict:${String(oldValue)}`);
      }
    }

    const { expected, input } = scenarioCase;
    const buffer = OverflowEvictOrder.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    assert.deepStrictEqual(buffer.events, expected.events);
  }

  static 'on-overflow-full'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-overflow-full'>): void {
    const { expected, input } = scenarioCase;
    const buffer = OverflowTracker.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    assert.equal(buffer.overflowValues.length, expected.overflowCount);
    assert.equal(buffer.overflowValues[0], expected.overflowValue);
  }

  static 'on-overflow-incoming-value'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-overflow-incoming-value'>): void {
    const { expected, input } = scenarioCase;
    const buffer = OverflowTracker.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    assert.equal(buffer.overflowValues[0], expected.overflowValue);
  }

  static 'on-overflow-not-full'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-overflow-not-full'>): void {
    const { expected, input } = scenarioCase;
    const buffer = OverflowTracker.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    assert.equal(buffer.overflowValues.length, expected.overflowCount);
  }

  static 'on-percentile-absent-when-empty'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-percentile-absent-when-empty'>): void {
    const { expected, input } = scenarioCase;
    const buffer = PercentileAudit.create(input.sampleBuffer);
    buffer.percentile(input.pct);
    assert.equal(buffer.percentileLog.length, expected.percentileLogLength);
  }

  static 'on-percentile-called'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-percentile-called'>): void {
    const { expected, input } = scenarioCase;
    const buffer = PercentileAudit.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    buffer.percentile(input.pct);
    assert.equal(buffer.percentileLog.length, 1);
    assert.equal(buffer.percentileLog[0]?.pct, expected.pct);
    assert.equal(buffer.percentileLog[0]?.result, expected.result);
    assert.ok(typeof buffer.percentileLog[0]?.result === expected.resultType);
  }

  static 'on-percentile-edge-cases'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-percentile-edge-cases'>): void {
    const { expected, input } = scenarioCase;
    const buffer = PercentileAudit.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    buffer.percentile(Number(input.percentiles[0]));
    buffer.percentile(Number(input.percentiles[1]));
    assert.equal(buffer.percentileLog.length, 2);
    assert.equal(buffer.percentileLog[0]?.pct, input.percentiles[0]);
    assert.equal(buffer.percentileLog[1]?.pct, input.percentiles[1]);
    assert.equal(buffer.percentileLog[0]?.result, expected.results[0]);
    assert.equal(buffer.percentileLog[1]?.result, expected.results[1]);
  }

  static 'on-percentile-result-matches-return'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-percentile-result-matches-return'>): void {
    const { expected, input } = scenarioCase;
    const buffer = PercentileAudit.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    const returned = buffer.percentile(input.pct);
    assert.equal(returned, expected.result);
    assert.equal(buffer.percentileLog[0]?.result, returned);
  }

  static 'on-push'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-push'>): void {
    const { expected, input } = scenarioCase;
    const buffer = PushAudit.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    assert.deepStrictEqual(buffer.pushLog, expected.pushLog);
  }

  static 'on-push-length-update'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'on-push-length-update'>): void {
    const { expected, input } = scenarioCase;
    let lengthAtHook = -1;
    class CheckLength extends SampleBuffer {
      override onPush(): void {
        lengthAtHook = this.count;
      }
    }

    const buffer = CheckLength.create(input.sampleBuffer);
    buffer.push(input.value);
    assert.equal(lengthAtHook, expected.lengthAtHook);
  }

  static 'throwing-on-clear'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'throwing-on-clear'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ThrowingClearBuffer.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    assert.throws(() => {
      buffer.clear();
    }, HookInvocationError);
    assert.equal(buffer.length, expected.length);
    assert.equal(buffer.percentile(input.pct), expected.percentile);
  }

  static 'throwing-on-compute-start'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'throwing-on-compute-start'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ThrowingComputeBuffer.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    assert.throws(
      () => {
        buffer.percentile(input.pct);
      },
      (thrown) => {
        const error: unknown = thrown;
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.constructor.name, expected.errorName);
        return true;
      }
    );
  }

  static 'throwing-on-evict'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'throwing-on-evict'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ThrowingEvictBuffer.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.primingPushItems);
    assert.throws(() => {
      buffer.push(input.overflowPush);
    }, HookInvocationError);
    assert.equal(buffer.length, expected.length);
    const percentiles = input.percentiles;
    for (let index = 0; index < percentiles.length; index += 1) {
      const percentile = Number(percentiles[index]);
      assert.equal(buffer.percentile(percentile), SampleBufferSubclassRunners.percentileAtEdge(expected.percentiles, percentile));
    }
  }

  static 'throwing-on-overflow'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'throwing-on-overflow'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ThrowingOverflowBuffer.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.primingPushItems);
    assert.throws(() => {
      buffer.push(input.overflowPush);
    }, HookInvocationError);
    assert.equal(buffer.length, expected.length);
    const percentiles = input.percentiles;
    for (let index = 0; index < percentiles.length; index += 1) {
      const percentile = Number(percentiles[index]);
      assert.equal(buffer.percentile(percentile), SampleBufferSubclassRunners.percentileAtEdge(expected.percentiles, percentile));
    }
  }

  static 'throwing-on-percentile'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'throwing-on-percentile'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ThrowingPercentileBuffer.create(input.sampleBuffer);
    SampleBufferSubclassRunners.pushAll(buffer, input.pushItems);
    assert.throws(
      () => {
        buffer.percentile(input.pct);
      },
      (thrown) => {
        const error: unknown = thrown;
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.constructor.name, expected.errorName);
        return true;
      }
    );
  }

  static 'throwing-on-push'(scenarioCase: ScenarioCaseOfType<SampleBufferSubclassScenarioCaseEntity.Type, 'throwing-on-push'>): void {
    const { expected, input } = scenarioCase;
    const buffer = ThrowingPushBuffer.create(input.sampleBuffer);
    assert.throws(() => {
      buffer.push(input.pushValue);
    }, HookInvocationError);
    assert.equal(buffer.length, expected.length);
    assert.equal(buffer.percentile(input.pct), expected.percentile);
  }

  static async rejectAfterTick(message: string): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create(message);
  }

  private static flushImmediate(): Promise<void> {
    const flushed = new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    return flushed;
  }

  /** `percentiles` fixtures key by exact percentile string; branching on the number keeps the lookup type-safe with no dynamic indexing. */
  private static percentileAtEdge(percentiles: { '0': number; '100': number }, percentile: number): number {
    let result = 0;
    if (percentile === 0) {
      result = percentiles['0'];
    } else if (percentile === 100) {
      result = percentiles['100'];
    } else {
      throw new UnexpectedPercentileError(percentile);
    }
    return result;
  }

  private static percentileAtQuartile(results: { '0': number; '100': number; '25': number; '50': number }, percentile: number): number {
    let result = 0;
    if (percentile === 0) {
      result = results['0'];
    } else if (percentile === 25) {
      result = results['25'];
    } else if (percentile === 50) {
      result = results['50'];
    } else if (percentile === 100) {
      result = results['100'];
    } else {
      throw new UnexpectedPercentileError(percentile);
    }
    return result;
  }

  private static pushAll(buffer: SampleBuffer, values: readonly number[]): void {
    for (let index = 0; index < values.length; index += 1) {
      buffer.push(Number(values[index]));
    }
  }
}

ScenarioSuite.register({
  'entity': SampleBufferSubclassScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'SampleBuffer subclass extension',
  'runners': SampleBufferSubclassRunners
});
