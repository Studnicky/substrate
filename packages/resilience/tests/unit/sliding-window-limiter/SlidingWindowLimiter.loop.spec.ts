import type { HookInvocationError } from '@studnicky/errors/node';
import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SlidingWindowLimiterOptionsInterface } from '../../../src/interfaces/SlidingWindowLimiterOptionsInterface.js';

import { SlidingWindowLimiterOptionsEntity } from '../../../src/entities/SlidingWindowLimiterOptionsEntity.js';
import { SlidingWindowLimiterConfigError } from '../../../src/errors/SlidingWindowLimiterConfigError.js';
import { SlidingWindowExhaustedError } from '../../../src/SlidingWindowExhaustedError.js';
import { SlidingWindowLimiter } from '../../../src/SlidingWindowLimiter.js';
import { SlidingWindowLimiterScenarioCaseEntity } from '../entities/SlidingWindowLimiterScenarioCaseEntity.js';
import scenarioGroups from './SlidingWindowLimiter.scenarios.json' with { 'type': 'json' };

class HookRecordingLimiter extends SlidingWindowLimiter {
  static override create(options: SlidingWindowLimiterOptionsInterface): HookRecordingLimiter {
    const result = new HookRecordingLimiter(options);
    return result;
  }

  get recordedHookErrors(): readonly HookInvocationError[] {
    const result = this.getHookErrors();
    return result;
  }
}

class SlidingWindowLimiterRunners {
  static 'async-allow-rejection'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'async-allow-rejection'>): Promise<void> {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    const limiter = HookRecordingLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input));
    Object.assign(limiter, {
      'onAllow': async (): Promise<void> => {
        await Promise.resolve();
        throw RuntimeError.create('async onAllow boom');
      }
    });
    const rejectionEvents: Error[] = [];
    const onUnhandledRejection = (): void => { rejectionEvents.push(RuntimeError.create('unexpected unhandled rejection')); };
    process.on('unhandledRejection', onUnhandledRejection);

    const result = (async () => {
      try {
        limiter.consume();
        await new Promise((resolve) => { setImmediate(resolve); });
        await new Promise((resolve) => { setImmediate(resolve); });

        assert.strictEqual(rejectionEvents.length, 0);
        assert.strictEqual(limiter.recordedHookErrors.length, Number(expected.errorCount));
        assert.strictEqual(limiter.recordedHookErrors[0]?.hookName, ScenarioValues.requireStringArray(expected.hookNames, 'Scenario expected.hookNames')[0]);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    })();
    return result;
  }

  static 'async-notification-order'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'async-notification-order'>): Promise<void> {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    const hookNames = ScenarioValues.requireStringArray(expected.hookNames, 'Scenario expected.hookNames');
    let time = 0;
    const limiter = HookRecordingLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input, () => {return time;}));
    Object.assign(limiter, {
      'onAllow': async (): Promise<void> => {
        await Promise.resolve();
        throw RuntimeError.create('async onAllow boom');
      }
    });
    Object.assign(limiter, {
      'onReject': async (): Promise<void> => {
        await Promise.resolve();
        throw RuntimeError.create('async onReject boom');
      }
    });
    Object.assign(limiter, {
      'onWindowRoll': async (): Promise<void> => {
        await Promise.resolve();
        throw RuntimeError.create('async onWindowRoll boom');
      }
    });
    const rejectionEvents: Error[] = [];
    const onUnhandledRejection = (): void => { rejectionEvents.push(RuntimeError.create('unexpected unhandled rejection')); };
    process.on('unhandledRejection', onUnhandledRejection);

    const result = (async () => {
      try {
        limiter.consume();
        time = input.windowMs + 1;
        limiter.consume();
        assert.throws(() => {
          limiter.consume();
        }, SlidingWindowExhaustedError);

        await new Promise((resolve) => { setImmediate(resolve); });
        await new Promise((resolve) => { setImmediate(resolve); });

        assert.strictEqual(rejectionEvents.length, 0);
        assert.strictEqual(limiter.recordedHookErrors.length, Number(expected.errorCount));
        assert.strictEqual(limiter.recordedHookErrors[0]?.hookName, hookNames[0]);
        assert.strictEqual(limiter.recordedHookErrors[1]?.hookName, hookNames[1]);
        assert.strictEqual(limiter.recordedHookErrors[2]?.hookName, hookNames[2]);
        assert.strictEqual(limiter.recordedHookErrors[3]?.hookName, hookNames[3]);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    })();
    return result;
  }

  static 'counter-blends-previous-window'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'counter-blends-previous-window'>): void {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    const firstAdvanceMs = ScenarioValues.requireDefined(input.firstAdvanceMs, 'firstAdvanceMs');
    const secondWaveAttempts = ScenarioValues.requireDefined(input.secondWaveAttempts, 'secondWaveAttempts');
    let time = 0;
    const limiter = SlidingWindowLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input, () => {return time;}));
    for (let index = 0; index < input.limit; index += 1) {
      limiter.consume();
    }
    assert.throws(() => {
      limiter.consume();
    }, SlidingWindowExhaustedError);
    time = firstAdvanceMs;
    for (let index = 0; index < secondWaveAttempts; index += 1) {
      limiter.consume();
    }
    assert.throws(() => {
      limiter.consume();
    }, SlidingWindowExhaustedError);
    assert.strictEqual(Number(expected.beforePruneRejects), 1);
    assert.strictEqual(Number(expected.afterPruneRejects), 1);
  }

  static 'default-clock-consume'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'default-clock-consume'>): void {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    const limiter = SlidingWindowLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input));
    limiter.consume();
    assert.strictEqual(Number(expected.admitted), 1);
  }

  static 'default-clock-consume-counter'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'default-clock-consume-counter'>): void {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    const limiter = SlidingWindowLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input));
    limiter.consume();
    assert.strictEqual(Number(expected.admitted), 1);
  }

  static 'hook-error-isolation'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'hook-error-isolation'>): void {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    class ThrowingAllowLimiter extends SlidingWindowLimiter {
      static override create(options: SlidingWindowLimiterOptionsInterface): ThrowingAllowLimiter {
        return new ThrowingAllowLimiter(options);
      }
      readonly failure = RuntimeError.create('onAllow boom', { 'cause': { 'windows': [1] } });
      get recordedHookErrorCount(): number { return this.hookErrorCount; }
      get recordedHookErrors(): readonly HookInvocationError[] {
        const result = this.getHookErrors();
        return result;
      }
      protected override onAllow(): void { throw this.failure; }
    }

    const first = ThrowingAllowLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input));
    const second = ThrowingAllowLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input));

    first.consume();
    const firstSnapshot = first.recordedHookErrors;

    assert.strictEqual(first.recordedHookErrorCount, Number(expected.firstCount));
    assert.strictEqual(second.recordedHookErrorCount, 0);
    assert.ok(firstSnapshot[0]?.cause instanceof Error);
    assert.strictEqual(firstSnapshot[0].cause.message, first.failure.message);

    second.consume();

    assert.strictEqual(first.recordedHookErrorCount, Number(expected.firstCount));
    assert.strictEqual(second.recordedHookErrorCount, Number(expected.secondCount));
    assert.strictEqual(firstSnapshot.length, Number(expected.snapshotLength));
    assert.ok(second.recordedHookErrors[0]?.cause instanceof Error);
    assert.strictEqual(second.recordedHookErrors[0].cause.message, second.failure.message);
  }

  static 'hook-error-snapshot'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'hook-error-snapshot'>): void {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    class ThrowingAllowLimiter extends SlidingWindowLimiter {
      static override create(options: SlidingWindowLimiterOptionsInterface): ThrowingAllowLimiter {
        return new ThrowingAllowLimiter(options);
      }
      readonly failure = RuntimeError.create('onAllow boom', { 'cause': { 'windows': [1] } });
      get recordedHookErrorCount(): number { return this.hookErrorCount; }
      get recordedHookErrors(): readonly HookInvocationError[] {
        const result = this.getHookErrors();
        return result;
      }
      protected override onAllow(): void { throw this.failure; }
    }

    const limiter = ThrowingAllowLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input));
    limiter.consume();

    assert.strictEqual(limiter.recordedHookErrorCount, Number(expected.firstCount));
    const firstCause = limiter.recordedHookErrors[0]?.cause;
    assert.ok(firstCause instanceof Error);
    firstCause.message = 'mutated';
    const firstDetails = firstCause.cause;
    assert.ok(firstDetails !== null && typeof firstDetails === 'object');
    const firstWindows: unknown = Reflect.get(firstDetails, 'windows');
    assert.ok(Array.isArray(firstWindows));
    firstWindows.push(2);

    const secondCause = limiter.recordedHookErrors[0]?.cause;
    assert.ok(secondCause instanceof Error);
    assert.strictEqual(secondCause.message, 'onAllow boom');
    assert.strictEqual(limiter.recordedHookErrorCount, Number(expected.firstCount));
    const secondDetails = secondCause.cause;
    assert.ok(secondDetails !== null && typeof secondDetails === 'object');
    const secondWindows: unknown = Reflect.get(secondDetails, 'windows');
    assert.ok(Array.isArray(secondWindows));
    assert.strictEqual(secondWindows.length, Number(expected.snapshotLength));
    assert.strictEqual(secondWindows[0], 1);
  }

  static 'hook-event'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'hook-event'>): void {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    const hook = ScenarioValues.requireDefined(input.hook, 'hook');
    const time = 0;
    const limiter = new class extends SlidingWindowLimiter {
      readonly events: { 'type': string; 'value'?: number }[] = [];
      constructor(options: SlidingWindowLimiterOptionsInterface) { super(options); }
      protected override onAllow(count: number): void { this.events.push({ 'type': 'allow', 'value': count }); }
      protected override onReject(count: number): void { this.events.push({ 'type': 'reject', 'value': count }); }
      protected override onWindowRoll(): void { this.events.push({ 'type': 'windowRoll' }); }
    }(SlidingWindowLimiterRunners.resolveLimiterConfig(input, () => {return time;}));

    limiter.consume();
    if (hook === 'reject') {
      assert.throws(() => {
        limiter.consume();
      }, SlidingWindowExhaustedError);
    }

    assert.deepStrictEqual(limiter.events, expected.events);
  }

  static 'invalid-config'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'invalid-config'>): void {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    assert.throws(() => {
      SlidingWindowLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input));
    }, SlidingWindowLimiterConfigError);
    assert.strictEqual(expected.errorName, SlidingWindowLimiterConfigError.name);
  }

  static 'limit-plus-one-throws'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'limit-plus-one-throws'>): void {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    const admitCount = ScenarioValues.requireDefined(input.admitCount, 'admitCount');
    const time = 0;
    const limiter = SlidingWindowLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input, () => {return time;}));
    for (let index = 0; index < admitCount; index += 1) {
      limiter.consume();
    }
    assert.throws(() => {
      limiter.consume();
    }, SlidingWindowExhaustedError);
    assert.strictEqual(Number(expected.admitted), admitCount);
  }

  static 'log-prunes-stale-entries'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'log-prunes-stale-entries'>): void {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    const firstAdvanceMs = ScenarioValues.requireDefined(input.firstAdvanceMs, 'firstAdvanceMs');
    const secondAdvanceMs = ScenarioValues.requireDefined(input.secondAdvanceMs, 'secondAdvanceMs');
    let time = 0;
    const limiter = SlidingWindowLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input, () => {return time;}));
    limiter.consume();
    time = firstAdvanceMs;
    limiter.consume();
    assert.throws(() => {
      limiter.consume();
    }, SlidingWindowExhaustedError);
    time = secondAdvanceMs;
    limiter.consume();
    assert.throws(() => {
      limiter.consume();
    }, SlidingWindowExhaustedError);
    assert.strictEqual(Number(expected.beforePruneRejects), 1);
    assert.strictEqual(Number(expected.afterPruneRejects), 1);
  }

  static 'recovers-after-window'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'recovers-after-window'>): void {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    const admitCount = ScenarioValues.requireDefined(input.admitCount, 'admitCount');
    const advanceAfterRejectMs = ScenarioValues.requireDefined(input.advanceAfterRejectMs, 'advanceAfterRejectMs');
    let time = 0;
    const limiter = SlidingWindowLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input, () => {return time;}));
    for (let index = 0; index < admitCount; index += 1) {
      limiter.consume();
    }
    assert.throws(() => {
      limiter.consume();
    }, SlidingWindowExhaustedError);
    time = advanceAfterRejectMs;
    limiter.consume();
    assert.strictEqual(Number(expected.admittedBeforeRetry), admitCount);
    assert.strictEqual(Number(expected.retryAfterMs), advanceAfterRejectMs);
  }

  static async 'structural-compatibility'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'structural-compatibility'>): Promise<void> {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    const consumeTokens = ScenarioValues.requireDefined(input.consumeTokens, 'consumeTokens');
    const waitTokens = ScenarioValues.requireDefined(input.waitTokens, 'waitTokens');
    const limiter = SlidingWindowLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input));
    limiter.consume(consumeTokens);
    await limiter.waitForToken({ 'tokens': waitTokens });
    assert.strictEqual(expected.output, 'resolved');
  }

  static async 'wait-for-token-aborts'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'wait-for-token-aborts'>): Promise<void> {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    const abortMessage = ScenarioValues.requireDefined(input.abortMessage, 'abortMessage');
    const time = 0;
    const limiter = SlidingWindowLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input, () => {return time;}));
    limiter.consume();
    const controller = new AbortController();
    setImmediate(() => {
      controller.abort(RuntimeError.create(abortMessage));
    });
    await assert.rejects(() => {
      const result = limiter.waitForToken({ 'signal': controller.signal });
      return result;
    }, { 'message': abortMessage });
    assert.strictEqual(expected.rejectionMessage, abortMessage);
  }

  static 'window-roll'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'window-roll'>): void {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    const rollAfterMs = ScenarioValues.requireDefined(input.rollAfterMs, 'rollAfterMs');
    let time = 0;
    const limiter = new class extends SlidingWindowLimiter {
      readonly events: { 'type': string }[] = [];
      constructor(options: SlidingWindowLimiterOptionsInterface) { super(options); }
      protected override onWindowRoll(): void { this.events.push({ 'type': 'windowRoll' }); }
    }(SlidingWindowLimiterRunners.resolveLimiterConfig(input, () => {return time;}));

    limiter.consume();
    if (input.algorithm === 'counter') {
      limiter.consume();
    }
    time = rollAfterMs;
    limiter.consume();
    assert.deepStrictEqual(limiter.events.map((event) => {return event.type;}), expected.events);
  }

  static 'within-limit'(scenarioCase: ScenarioCaseOfType<SlidingWindowLimiterScenarioCaseEntity.Type, 'within-limit'>): void {
    const input = scenarioCase.input.slidingWindowLimiter;
    const expected = scenarioCase.expected;
    const admitCount = ScenarioValues.requireDefined(input.admitCount, 'admitCount');
    const time = 0;
    const limiter = SlidingWindowLimiter.create(SlidingWindowLimiterRunners.resolveLimiterConfig(input, () => {return time;}));
    for (let index = 0; index < admitCount; index += 1) {
      limiter.consume();
    }
    assert.strictEqual(Number(expected.admitted), admitCount);
  }

  private static resolveLimiterConfig(input: SlidingWindowLimiterScenarioCaseEntity.Type['input']['slidingWindowLimiter'], clock?: () => number): SlidingWindowLimiterOptionsInterface {
    const config: SlidingWindowLimiterOptionsInterface = {
      'algorithm': input.algorithm,
      'limit': input.limit,
      'windowMs': input.windowMs
    };

    const result = clock === undefined ? config : { ...config, 'clock': clock };
    return result;
  }
}

ScenarioSuite.register({
  'entity': SlidingWindowLimiterScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'SlidingWindowLimiter',
  'runners': SlidingWindowLimiterRunners
});

void describe('SlidingWindowLimiter unknown-property boundary', () => {
  void it('rejects an unrecognized configuration property instead of discarding it', () => {
    const serializableOptions = {
      'algorithm': 'log',
      'limit': 1,
      'windowMs': 1_000
    } satisfies SlidingWindowLimiterOptionsInterface;
    const configuration = Object.assign(serializableOptions, { 'unrecognizedOption': true });

    assert.equal(SlidingWindowLimiterOptionsEntity.validate(configuration), false);
    assert.throws(() => { SlidingWindowLimiter.create(configuration); }, SlidingWindowLimiterConfigError);
  });
});
