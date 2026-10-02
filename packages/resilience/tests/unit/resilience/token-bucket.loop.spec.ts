import type { HookInvocationError } from '@studnicky/errors/node';
import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import type { TokenBucketOptionsInterface } from '../../../src/index.js';

import { RateLimitConsumptionEntity, TokenBucketOptionsEntity } from '../../../src/entities/index.js';
import {
  RateLimiterClock,
  ResilienceConfigError,
  SlidingWindowLimiter,
  TokenBucket,
  TokenBucketExhaustedError
} from '../../../src/index.js';
import { TokenBucketScenarioCaseEntity } from '../entities/TokenBucketScenarioCaseEntity.js';
import scenarioGroups from './token-bucket.scenarios.json' with { 'type': 'json' };

class ObservedBucket extends TokenBucket {
  readonly events: { 'type': string; 'value'?: number }[] = [];
  constructor(options: TokenBucketOptionsInterface) { super(options); }
  protected override onTokenAcquired(count: number): void { this.events.push({ 'type': 'acquired', 'value': count }); }
  protected override onTokenDepleted(): void { this.events.push({ 'type': 'depleted' }); }
  protected override onRefill(added: number): void { this.events.push({ 'type': 'refill', 'value': added }); }
}

class ThrowingAcquiredBucket extends TokenBucket {
  protected override onTokenAcquired(): void { throw RuntimeError.create('onTokenAcquired boom'); }
  get hookErrorCount(): number { return this.hooks.hookErrorCount; }
}

class ThrowingDepletedBucket extends TokenBucket {
  protected override onTokenDepleted(): void { throw RuntimeError.create('onTokenDepleted boom'); }
  get hookErrorCount(): number { return this.hooks.hookErrorCount; }
}

class ThrowingRefillBucket extends TokenBucket {
  protected override onRefill(): void { throw RuntimeError.create('onRefill boom'); }
  get hookErrorCount(): number { return this.hooks.hookErrorCount; }
}

class RecordingBucket extends TokenBucket {
  constructor(options: TokenBucketOptionsInterface) { super(options); }
  get recordedHookErrors(): readonly HookInvocationError[] {
    const result = this.hooks.getHookErrors();
    return result;
  }
}

class TokenBucketRunners {
  static 'entity-rate-limit-consumption'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'entity-rate-limit-consumption'>): void {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    assert.equal(
      RateLimitConsumptionEntity.validate(input.valid),
      expected.valid
    );
    assert.equal(
      RateLimitConsumptionEntity.validate(input.invalid),
      expected.invalid
    );
  }

  static async 'tb-async-hook-isolation'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-async-hook-isolation'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (): void => { rejectionEvents.push(undefined); };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const firstCause = RuntimeError.create(input.first);
      const secondCause = RuntimeError.create(input.second);
      const first = new RecordingBucket(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return input.clock;} }));
      Object.assign(first, {
        'onTokenAcquired': async (): Promise<void> => {
          await Promise.resolve();
          throw firstCause;
        }
      });
      const second = new RecordingBucket(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return input.clock;} }));
      Object.assign(second, {
        'onTokenAcquired': async (): Promise<void> => {
          await Promise.resolve();
          throw secondCause;
        }
      });
      first.consume();
      second.consume();
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionEvents.length, expected.rejectionEvents);
      assert.equal(first.available, 4);
      const firstErrors = first.recordedHookErrors;
      const secondErrors = second.recordedHookErrors;
      assert.equal(firstErrors.length, expected.hookErrorCount);
      assert.equal(firstErrors[0]?.hookName, expected.hookName);
      assert.ok(firstErrors[0]?.cause instanceof Error);
      assert.equal(firstErrors[0].cause.message, firstCause.message);
      assert.equal(second.available, 4);
      assert.equal(secondErrors.length, expected.hookErrorCount);
      assert.equal(secondErrors[0]?.hookName, expected.hookName);
      assert.ok(secondErrors[0]?.cause instanceof Error);
      assert.equal(secondErrors[0].cause.message, secondCause.message);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static 'tb-available'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-available'>): void {
    const input = scenarioCase.input.resilience;
    const bucket1 = TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return input.clock;} }));
    assert.equal(bucket1.available, 5);
    const bucket2 = TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return input.clock;} }));
    bucket2.consume(input.consume[0]);
    assert.equal(bucket2.available, 3);
  }

  static 'tb-cap'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-cap'>): void {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const clock = input.clock;
    let time = clock[0] ?? 0;
    const bucket = TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return time;} }));
    time = clock[1] ?? time;
    assert.equal(bucket.available, expected.availableAtCap);
  }

  static 'tb-consume-exhausted'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-consume-exhausted'>): void {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const bucket = TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input));
    bucket.consume();
    bucket.consume();
    assert.throws(() => { bucket.consume(); }, TokenBucketExhaustedError);
    assert.equal(bucket.available < 1, expected.exhausted);
  }

  static 'tb-consume-multi'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-consume-multi'>): void {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const bucket = TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input));
    const consume = input.consume;
    bucket.consume(consume[0]);
    if (expected.exhaustedOnSecondConsume) {
      assert.throws(() => { bucket.consume(consume[1]); }, TokenBucketExhaustedError);
    } else {
      assert.doesNotThrow(() => { bucket.consume(consume[1]); });
    }
  }

  static 'tb-consume-ok'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-consume-ok'>): void {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const bucket = TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input));
    for (let tokensIndex = 0; tokensIndex < input.consume.length; tokensIndex += 1) {
      const tokens = ScenarioValues.requireDefined(input.consume[tokensIndex], 'Scenario input.consume[tokensIndex]');
      bucket.consume(tokens);
    }
    assert.equal(bucket.available, expected.available);
    assert.equal(bucket.available < 1, expected.exhausted);
  }

  static 'tb-consumption-observation'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-consumption-observation'>): void {
    const input = scenarioCase.input.resilience;
    const clock = input.clock;
    let time = clock[0] ?? 0;
    const bucket = TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return time;} }));
    const consume = input.consume;
    bucket.consume(consume[0]);
    time = clock[1] ?? time;
    const observation = bucket.consume(consume[1]);
    assert.deepEqual(observation, scenarioCase.expected.observation);
    assert.equal(RateLimitConsumptionEntity.validate(observation), true);
  }

  static async 'tb-hook-swallows'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-hook-swallows'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const available = expected.available;
    const acquired = ThrowingAcquiredBucket.create(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return input.clock;} }));
    acquired.consume(input.consume);
    assert.equal(acquired.available, available[0]);
    const waitBucket = ThrowingAcquiredBucket.create(TokenBucketRunners.tokenBucketOptions(input, {
      'burstSize': input.waitBurstSize,
      'clock': () => {return input.clock;}
    }));
    await waitBucket.waitForToken({ 'tokens': input.waitTokens });
    assert.equal(waitBucket.available, available[1]);
    const depleted = ThrowingDepletedBucket.create(TokenBucketRunners.tokenBucketOptions(input, {
      'burstSize': input.depletedBurstSize,
      'clock': () => {return input.clock;}
    }));
    depleted.consume();
    assert.throws(() => { depleted.consume(); }, TokenBucketExhaustedError);
    const refillClock = input.refillClock;
    let time = refillClock[0] ?? 0;
    const refill = ThrowingRefillBucket.create(TokenBucketRunners.tokenBucketOptions(input, {
      'burstSize': input.refillBurstSize,
      'clock': () => {return time;}
    }));
    refill.consume(input.refillBurstSize);
    time = refillClock[1] ?? time;
    assert.equal(refill.available, available[2]);
    assert.equal(
      acquired.hookErrorCount > 0 && waitBucket.hookErrorCount > 0 && depleted.hookErrorCount > 0 && refill.hookErrorCount > 0,
      expected.errorsSwallowed
    );
  }

  static 'tb-invalid-burst'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-invalid-burst'>): void {
    const input = scenarioCase.input.resilience;
    assert.throws(() => { TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input)); }, ResilienceConfigError);
  }

  static 'tb-invalid-rps'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-invalid-rps'>): void {
    const input = scenarioCase.input.resilience;
    assert.throws(() => { TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input)); }, ResilienceConfigError);
  }

  static async 'tb-listener-leak'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-listener-leak'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const controller = new AbortController();
    const { signal } = controller;
    const addSpy = mock.method(signal, 'addEventListener');
    const removeSpy = mock.method(signal, 'removeEventListener');
    let time = 0;
    const bucket = TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return time;} }));
    bucket.consume();
    for (let i = 0; i < input.iterations; i += 1) {
      const wait = bucket.waitForToken({ 'signal': signal });
      time += 2;
      await wait;
    }
    assert.equal(addSpy.mock.callCount(), expected.addCount);
    assert.equal(removeSpy.mock.callCount(), expected.removeCount);
  }

  static 'tb-observed-acquired'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-observed-acquired'>): void {
    const input = scenarioCase.input.resilience;
    const [event] = scenarioCase.expected.events;
    if (event === undefined) {
      throw RuntimeError.create('Expected token bucket acquired event fixture');
    }
    const bucket = new ObservedBucket(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return input.clock;} }));
    bucket.consume(input.consume);
    assert.equal(bucket.events[0]?.type, event.type);
    assert.equal(bucket.events[0]?.value, event.value);
  }

  static 'tb-observed-depleted'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-observed-depleted'>): void {
    const input = scenarioCase.input.resilience;
    const bucket = new ObservedBucket(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return input.clock;} }));
    const consume = input.consume;
    bucket.consume(consume[0]);
    assert.throws(() => { bucket.consume(consume[1]); }, TokenBucketExhaustedError);
    assert.ok(bucket.events.some((error) => {
      const result = error.type === 'depleted';
      return result;
    }));
  }

  static 'tb-observed-refill'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-observed-refill'>): void {
    const input = scenarioCase.input.resilience;
    const clock = input.clock;
    let time = clock[0] ?? 0;
    const bucket = new ObservedBucket(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return time;} }));
    bucket.consume(input.consume);
    bucket.events.length = 0;
    time = clock[1] ?? time;
    assert.ok(bucket.available >= 0);
    assert.ok(bucket.events.some((error) => {
      const result = error.type === 'refill' && (error.value ?? 0) > 0;
      return result;
    }));
  }

  static async 'tb-observed-wait'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-observed-wait'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const bucket = new ObservedBucket(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return input.clock;} }));
    await bucket.waitForToken();
    assert.ok(bucket.events.some((error) => {
      const result = error.type === 'acquired';
      return result;
    }));
  }

  static 'tb-refill'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-refill'>): void {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const clock = input.clock;
    let time = clock[0] ?? 0;
    const bucket = TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return time;} }));
    bucket.consume(input.consume[0]);
    assert.equal(bucket.available, expected.availableAfterConsume);
    time = clock[1] ?? time;
    assert.ok(bucket.available >= expected.availableAfterRefillAt500Ms);
  }

  static async 'tb-wait-abort'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-wait-abort'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const controller = new AbortController();
    const bucket = TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input));
    bucket.consume();
    setImmediate(() => { controller.abort(RuntimeError.create('cancelled')); });
    await assert.rejects(() => {
      const result = bucket.waitForToken({ 'signal': controller.signal, 'tokens': input.tokens });
      return result;
    });
  }

  static async 'tb-wait-immediate'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-wait-immediate'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const bucket = TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return input.clock;} }));
    await bucket.waitForToken();
    assert.equal(bucket.available, expected.availableAfterWait);
  }

  static async 'tb-wait-refill'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-wait-refill'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const clock = input.clock;
    let time = clock[0] ?? 0;
    const bucket = TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input, { 'clock': () => {return time;} }));
    bucket.consume();
    let completed = false;
    const wait = bucket.waitForToken().then((observation) => { completed = true; return observation; });

    // First tick nudges the clock forward, but not far enough to refill a full
    // token — the wait must still be pending, proving it is genuinely gated on
    // refill rather than resolving as soon as any time passes.
    await new Promise<void>((resolve) => { setImmediate(() => { time = clock[1] ?? time; resolve(); }); });
    assert.equal(completed, false);

    // Second tick crosses the refill threshold; the pending wait now resolves.
    await new Promise<void>((resolve) => { setImmediate(() => { time = clock[2] ?? time; resolve(); }); });
    const observation = await wait;

    assert.equal(completed, expected.completed);
    assert.deepEqual(observation, expected.observation);
    assert.equal(bucket.available, expected.availableAfterWait);
  }

  static async 'tb-wait-too-many'(scenarioCase: ScenarioCaseOfType<TokenBucketScenarioCaseEntity.Type, 'tb-wait-too-many'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const bucket = TokenBucket.create(TokenBucketRunners.tokenBucketOptions(input));
    await assert.rejects(() => {
      const result = bucket.waitForToken({ 'tokens': input.tokens });
      return result;
    }, TokenBucketExhaustedError);
  }

  private static tokenBucketOptions(input: { 'burstSize': number; 'clock'?: number | readonly number[]; 'requestsPerSecond': number }, extra: { 'burstSize'?: number; 'clock'?: () => number; 'requestsPerSecond'?: number } = {}): TokenBucketOptionsInterface {
    const clock = input.clock;
    const options: TokenBucketOptionsInterface = {
      'burstSize': input.burstSize,
      'requestsPerSecond': input.requestsPerSecond
    };
    if (typeof clock === 'number') {
      Object.assign(options, { 'clock': (): number => {return clock;} });
    }
    Object.assign(options, extra);
    return options;
  }
}

ScenarioSuite.register({
  'entity': TokenBucketScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'TokenBucket',
  'runners': TokenBucketRunners
});

void describe('TokenBucket token demand boundaries', () => {
  const invalidTokenDemands: readonly number[] = [
    0,
    -1,
    Number.NaN,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY
  ];

  void it('consume rejects invalid demands without changing capacity', () => {
    for (let tokensIndex = 0; tokensIndex < invalidTokenDemands.length; tokensIndex += 1) {
      const tokens = ScenarioValues.requireDefined(invalidTokenDemands[tokensIndex], 'Scenario invalidTokenDemands[tokensIndex]');
      const bucket = TokenBucket.create({ 'burstSize': 3, 'requestsPerSecond': 1 });

      assert.throws(() => { bucket.consume(tokens); }, ResilienceConfigError);
      assert.equal(bucket.available, 3);
      assert.deepEqual(bucket.consume(1), { 'consumedTokens': 1, 'remainingTokens': 2 });
    }
  });

  void it('waitForToken rejects invalid demands without changing capacity', async () => {
    for (let tokensIndex = 0; tokensIndex < invalidTokenDemands.length; tokensIndex += 1) {
      const tokens = ScenarioValues.requireDefined(invalidTokenDemands[tokensIndex], 'Scenario invalidTokenDemands[tokensIndex]');
      const bucket = TokenBucket.create({ 'burstSize': 3, 'requestsPerSecond': 1 });

      await assert.rejects(() => {
        const result = bucket.waitForToken({ 'tokens': tokens });
        return result;
      }, ResilienceConfigError);
      assert.equal(bucket.available, 3);
      assert.deepEqual(bucket.consume(1), { 'consumedTokens': 1, 'remainingTokens': 2 });
    }
  });
});

void describe('TokenBucket unknown-property boundary', () => {
  void it('rejects an unrecognized configuration property instead of discarding it', () => {
    const configuration = Object.assign(
      { 'burstSize': 1, 'requestsPerSecond': 1 },
      { 'unrecognizedOption': true }
    );

    assert.equal(TokenBucketOptionsEntity.validate(configuration), false);
    assert.throws(() => { TokenBucket.create(configuration); }, ResilienceConfigError);
  });
});

void describe('TokenBucket configuration boundaries', () => {
  const invalidConfigurations: readonly TokenBucketOptionsInterface[] = [
    { 'burstSize': 1, 'requestsPerSecond': Number.NaN },
    { 'burstSize': 1, 'requestsPerSecond': Number.NEGATIVE_INFINITY },
    { 'burstSize': 1, 'requestsPerSecond': Number.POSITIVE_INFINITY },
    { 'burstSize': Number.NaN, 'requestsPerSecond': 1 },
    { 'burstSize': Number.NEGATIVE_INFINITY, 'requestsPerSecond': 1 },
    { 'burstSize': Number.POSITIVE_INFINITY, 'requestsPerSecond': 1 }
  ];

  void it('rejects non-finite configuration values through the canonical entity boundary', () => {
    for (let configurationIndex = 0; configurationIndex < invalidConfigurations.length; configurationIndex += 1) {
      const configuration = ScenarioValues.requireDefined(invalidConfigurations[configurationIndex], 'Scenario invalidConfigurations[configurationIndex]');
      assert.equal(TokenBucketOptionsEntity.validate(configuration), false);
      assert.throws(() => { TokenBucket.create(configuration); }, ResilienceConfigError);
    }
  });
});

void describe('Rate limiter clock boundaries', () => {
  const invalidReadings: readonly number[] = [Number.NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];

  void it('rejects non-callable clock collaborators', () => {
    assert.throws(() => { RateLimiterClock.create(0); }, ResilienceConfigError);
  });

  void it('rejects a throwing clock before rate math', () => {
    const clock = RateLimiterClock.create((): number => { throw RuntimeError.create('clock failure'); });
    assert.throws(() => { clock(); }, ResilienceConfigError);
  });

  void it('rejects non-finite clock readings before rate math', () => {
    for (let sourceIndex = 0; sourceIndex < invalidReadings.length; sourceIndex += 1) {
      const source = ScenarioValues.requireDefined(invalidReadings[sourceIndex], 'Scenario invalidReadings[sourceIndex]');
      const clock = RateLimiterClock.create(() => {return source;});
      assert.throws(() => { clock(); }, ResilienceConfigError);
    }
  });

  void it('rejects backward clock readings before rate math', () => {
    let time = 2;
    const clock = RateLimiterClock.create((): number => {return time;});
    assert.equal(clock(), 2);
    time = 1;
    assert.throws(() => { clock(); }, ResilienceConfigError);
  });

  void it('guards TokenBucket and SlidingWindowLimiter reads', () => {
    assert.throws(() => {
      TokenBucket.create({ 'burstSize': 1, 'clock': (): number => { throw RuntimeError.create('clock failure'); }, 'requestsPerSecond': 1 });
    }, ResilienceConfigError);
    assert.throws(() => {
      TokenBucket.create({ 'burstSize': 1, 'clock': (): number => {return Number.NaN;}, 'requestsPerSecond': 1 });
    }, ResilienceConfigError);
    assert.throws(() => {
      SlidingWindowLimiter.create({ 'algorithm': 'log', 'clock': (): number => {return Number.POSITIVE_INFINITY;}, 'limit': 1, 'windowMs': 1 });
    }, ResilienceConfigError);

    let tokenTime = 2;
    const tokenBucket = TokenBucket.create({ 'burstSize': 2, 'clock': (): number => {return tokenTime;}, 'requestsPerSecond': 1 });
    tokenTime = 1;
    assert.throws(() => { tokenBucket.consume(); }, ResilienceConfigError);

    let windowTime = 2;
    const limiter = SlidingWindowLimiter.create({ 'algorithm': 'log', 'clock': (): number => {return windowTime;}, 'limit': 2, 'windowMs': 1 });
    windowTime = 1;
    assert.throws(() => { limiter.consume(); }, ResilienceConfigError);
  });
});
