import { ClockError } from '@studnicky/clock/node';
import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { RateLimitConsumptionEntity } from '../../../src/entities/RateLimitConsumptionEntity.js';
import type { RateLimitConsumptionInterface } from '../../../src/interfaces/RateLimitConsumptionInterface.js';
import type {
  KeyedRateLimiterCreateConfigInterface,
  KeyedRateLimiterStrategyConfigInterface,
  RateLimiterStrategyInterface
} from '../../../src/keyed/interfaces/index.js';

import { ScenarioSuite, ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import {
  KeyedRateLimiterDefaultOptionsEntity,
  KeyedRateLimiterRegistryOptionsEntity,
  RateLimitRequestEntity
} from '../../../src/keyed/entities/index.js';
import { KeyedRateLimiter, KeyedRateLimiterBoundaryError, KeyedRateLimiterConfigError } from '../../../src/keyed/index.js';
import { TokenBucketExhaustedError } from '../../../src/TokenBucketExhaustedError.js';
import { KeyedRateLimiterScenarioCaseEntity } from '../entities/KeyedRateLimiterScenarioCaseEntity.js';
import scenarioGroups from './keyed-rate-limiter.scenarios.json' with { 'type': 'json' };

class TrackingEvictionLimiter extends KeyedRateLimiter {
  static build(config: KeyedRateLimiterCreateConfigInterface): TrackingEvictionLimiter {
    return new TrackingEvictionLimiter(super.createDefaultDependencies(config));
  }
  readonly created: string[] = [];
  readonly evicted: string[] = [];

  protected override onKeyCreated(key: string): void {
    this.created.push(key);
  }

  protected override onKeyEvicted(key: string): void {
    this.evicted.push(key);
  }
}

class TrackingLimiter extends KeyedRateLimiter {
  static build(config: KeyedRateLimiterCreateConfigInterface): TrackingLimiter {
    return new TrackingLimiter(super.createDefaultDependencies(config));
  }
  readonly evicted: string[] = [];

  protected override onKeyEvicted(key: string): void {
    this.evicted.push(key);
  }
}

class FakeFixedAllowance implements RateLimiterStrategyInterface {
  #remaining: number;

  constructor(allowance: number) {
    this.#remaining = allowance;
  }

  consume(tokens = 1): RateLimitConsumptionInterface {
    if (this.#remaining < tokens) {
      throw RuntimeError.create('fake allowance exhausted');
    }
    this.#remaining -= tokens;
    return { 'consumedTokens': tokens, 'remainingTokens': this.#remaining };
  }

  async waitForToken(
    options?: { 'signal'?: AbortSignal; 'tokens'?: number }
  ): Promise<RateLimitConsumptionInterface> {
    await Promise.resolve();
    const result = this.consume(options?.tokens ?? 1);
    return result;
  }

  get remaining(): number {
    return this.#remaining;
  }
}

class FixedResultStrategy implements RateLimiterStrategyInterface {
  consume(): RateLimitConsumptionInterface {
    const result = { 'consumedTokens': 1, 'remainingTokens': 0 };
    return result;
  }

  waitForToken(): Promise<RateLimitConsumptionInterface> {
    const result = Promise.resolve({ 'consumedTokens': 1, 'remainingTokens': 0 });
    return result;
  }
}

class KeyedRateLimiterRunners {
  static 'consume-default-result'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'consume-default-result'>): void {
    const limiter = KeyedRateLimiter.create(KeyedRateLimiterRunners.createConfig(scenarioCase.input.keyedRateLimiter, () => {return 0;}));
    const result = limiter.consume('user-result', scenarioCase.input.keyedRateLimiter.tokens);
    assert.deepEqual(result, scenarioCase.expected.result);
  }

  static 'consume-independent-keys'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'consume-independent-keys'>): void {
    const limiter = KeyedRateLimiter.create(KeyedRateLimiterRunners.createConfig(scenarioCase.input.keyedRateLimiter, () => {return 0;}));
    limiter.consume('user-a');
    assert.throws(() => { limiter.consume('user-a'); }, TokenBucketExhaustedError);
    limiter.consume('user-b');
  }

  static 'consume-requested-tokens'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'consume-requested-tokens'>): void {
    const limiter = KeyedRateLimiter.create(KeyedRateLimiterRunners.createConfig(scenarioCase.input.keyedRateLimiter, () => {return 0;}));
    limiter.consume('user-d', 5);
    assert.throws(() => { limiter.consume('user-d', 1); }, TokenBucketExhaustedError);
  }

  static 'consume-same-key-exhausts'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'consume-same-key-exhausts'>): void {
    const limiter = KeyedRateLimiter.create(KeyedRateLimiterRunners.createConfig(scenarioCase.input.keyedRateLimiter, () => {return 0;}));
    limiter.consume('user-c');
    limiter.consume('user-c');
    assert.throws(() => { limiter.consume('user-c'); }, TokenBucketExhaustedError);
  }

  static 'consume-strategy-created-once'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'consume-strategy-created-once'>): void {
    let factoryCalls = 0;
    const limiter = KeyedRateLimiter.create({
      'factory': () => {
        factoryCalls += 1;
        return new FixedResultStrategy();
      }
    });
    const firstResult = limiter.consume('user-e');
    const secondResult = limiter.consume('user-e');
    assert.deepEqual(firstResult, scenarioCase.expected.result);
    assert.deepEqual(secondResult, scenarioCase.expected.result);
    assert.equal(factoryCalls, scenarioCase.expected.factoryCalls);
  }

  static 'entities-invalid'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'entities-invalid'>): void {
    assert.equal(KeyedRateLimiterRegistryOptionsEntity.validate(scenarioCase.input.registry), scenarioCase.expected.accepted);
    assert.equal(RateLimitRequestEntity.validate(scenarioCase.input.rateLimitRequest), scenarioCase.expected.accepted);
  }

  static 'entities-valid'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'entities-valid'>): void {
    assert.equal(KeyedRateLimiterRegistryOptionsEntity.validate(scenarioCase.input.registry), scenarioCase.expected.accepted);
    assert.equal(RateLimitRequestEntity.validate(scenarioCase.input.rateLimitRequest), scenarioCase.expected.accepted);
  }

  static 'evicts-idle-key-at-capacity'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'evicts-idle-key-at-capacity'>): void {
    const limiter = TrackingEvictionLimiter.build(KeyedRateLimiterRunners.createConfig(scenarioCase.input.keyedRateLimiter, () => {return 0;}));
    limiter.consume('user-a');
    limiter.consume('user-b');
    limiter.consume('user-c');
    assert.deepEqual(limiter.created, scenarioCase.expected.created);
    assert.deepEqual(limiter.evicted, scenarioCase.expected.evicted);
  }

  static 'generic-cache-boundary'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'generic-cache-boundary'>): void {
    const { allowance, maximumKeys } = scenarioCase.input.keyedRateLimiter;
    const creations = new Map<string, number>();
    const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
      'factory': (key) => {
        creations.set(key, (creations.get(key) ?? 0) + 1);
        return new FakeFixedAllowance(allowance);
      },
      'maximumKeys': maximumKeys
    });
    limiter.consume('user-a');
    limiter.consume('user-b');
    limiter.consume('user-a');
    assert.deepEqual([...creations.entries()], scenarioCase.expected.creations);
  }

  static 'generic-fake-strategy'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'generic-fake-strategy'>): void {
    const { allowance } = scenarioCase.input.keyedRateLimiter;
    const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
      'factory': () => {return new FakeFixedAllowance(allowance);}
    });
    const firstResult = limiter.consume('user-a');
    const secondResult = limiter.consume('user-a');
    assert.deepEqual(firstResult, scenarioCase.expected.firstResult);
    assert.deepEqual(secondResult, scenarioCase.expected.secondResult);
    assert.throws(() => { limiter.consume('user-a'); });
    limiter.consume('user-b');
  }

  static 'generic-fractional-consumption-result'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'generic-fractional-consumption-result'>): void {
    const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
      'factory': () => {return new FakeFixedAllowance(2);}
    });
    const result = limiter.consume('user-fractional', 1.5);
    assert.deepEqual(result, scenarioCase.expected.result);
  }

  static 'getters-eviction-on-max-keys'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'getters-eviction-on-max-keys'>): void {
    const limiter = TrackingLimiter.build(KeyedRateLimiterRunners.createConfig(scenarioCase.input.keyedRateLimiter, () => {return 0;}));
    limiter.consume('user-a');
    limiter.consume('user-b');
    limiter.consume('user-c');
    limiter.consume('user-d');
    assert.deepEqual(limiter.evicted, scenarioCase.expected.evicted);
  }

  static 'on-token-acquired'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'on-token-acquired'>): void {
    const acquired: { 'key': string; 'result': RateLimitConsumptionEntity.Type }[] = [];

    class ObservedTokenAcquiredLimiter extends KeyedRateLimiter {
      static build(config: KeyedRateLimiterCreateConfigInterface): ObservedTokenAcquiredLimiter {
        const result = new ObservedTokenAcquiredLimiter(super.createDefaultDependencies(config));
        return result;
      }
      protected override onTokenAcquired(key: string, result: RateLimitConsumptionEntity.Type): void {
        acquired.push({ 'key': key, 'result': result });
      }
    }

    const limiter = ObservedTokenAcquiredLimiter.build(KeyedRateLimiterRunners.createConfig(scenarioCase.input.keyedRateLimiter, () => {return 0;}));
    limiter.consume('user-a', 1);
    limiter.consume('user-a', 1);
    assert.deepStrictEqual(acquired, scenarioCase.expected.acquired);
  }

  static 'recreates-strategy-after-eviction'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'recreates-strategy-after-eviction'>): void {
    const limiter = TrackingEvictionLimiter.build(KeyedRateLimiterRunners.createConfig(scenarioCase.input.keyedRateLimiter, () => {return 0;}));
    limiter.consume('user-a');
    limiter.consume('user-b');
    limiter.consume('user-c');
    limiter.consume('user-a');
    assert.deepEqual(limiter.created, scenarioCase.expected.created);
    assert.deepEqual(limiter.evicted, scenarioCase.expected.evicted);
  }

  static 'throwing-on-key-evicted'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'throwing-on-key-evicted'>): void {
    class ThrowingEvictedLimiter extends KeyedRateLimiter {
      static build(config: KeyedRateLimiterCreateConfigInterface): ThrowingEvictedLimiter {
        const result = new ThrowingEvictedLimiter(super.createDefaultDependencies(config));
        return result;
      }
      readonly created: string[] = [];
      readonly evicted: string[] = [];

      protected override onKeyCreated(key: string): void {
        this.created.push(key);
      }

      protected override onKeyEvicted(key: string): void {
        this.evicted.push(key);
        throw RuntimeError.create('onKeyEvicted boom');
      }
    }

    const limiter = ThrowingEvictedLimiter.build(KeyedRateLimiterRunners.createConfig(scenarioCase.input.keyedRateLimiter, () => {return 0;}));
    limiter.consume('user-a');
    limiter.consume('user-b');
    limiter.consume('user-c');
    limiter.consume('user-a');
    assert.deepEqual(limiter.created, scenarioCase.expected.created);
    assert.deepEqual(limiter.evicted, scenarioCase.expected.evicted);
  }

  static async 'generic-acquisition-observation'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'generic-acquisition-observation'>): Promise<void> {
    const acquired: { 'key': string; 'result': RateLimitConsumptionEntity.Type }[] = [];

    class ObservedGenericLimiter extends KeyedRateLimiter<FakeFixedAllowance> {
      static build(config: KeyedRateLimiterStrategyConfigInterface<FakeFixedAllowance>): ObservedGenericLimiter {
        const result = new ObservedGenericLimiter(super.createFactoryDependencies(config));
        return result;
      }
      protected override onTokenAcquired(
        key: string,
        result: RateLimitConsumptionEntity.Type
      ): void {
        acquired.push({ 'key': key, 'result': result });
      }
    }

    const limiter = ObservedGenericLimiter.build({
      'factory': () => {return new FakeFixedAllowance(2);}
    });
    limiter.consume('user-a');
    await limiter.waitForToken('user-a');
    assert.deepEqual(acquired, scenarioCase.expected.acquired);
  }

  static async 'generic-wait-for-token'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'generic-wait-for-token'>): Promise<void> {
    const { allowance } = scenarioCase.input.keyedRateLimiter;
    const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
      'factory': () => {return new FakeFixedAllowance(allowance);}
    });
    const result = await limiter.waitForToken('user-a');
    assert.deepEqual(result, scenarioCase.expected.result);
    assert.throws(() => { limiter.consume('user-a'); });
  }

  static async 'idle-key-expires-and-rebuilds'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'idle-key-expires-and-rebuilds'>): Promise<void> {
    const limiter = TrackingEvictionLimiter.build(KeyedRateLimiterRunners.createConfig(scenarioCase.input.keyedRateLimiter));
    limiter.consume('user-a');
    await new Promise<void>((resolve) => { setTimeout(resolve, scenarioCase.input.keyedRateLimiter.waitMs); });
    limiter.consume('user-a');
    assert.deepEqual(limiter.evicted, scenarioCase.expected.evicted);
    assert.deepEqual(limiter.created, scenarioCase.expected.created);
  }

  static async 'wait-abort-signal'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'wait-abort-signal'>): Promise<void> {
    const controller = new AbortController();
    const limiter = KeyedRateLimiter.create(KeyedRateLimiterRunners.createConfig(scenarioCase.input.keyedRateLimiter, () => {return 0;}));
    limiter.consume('user-d');
    setImmediate(() => { controller.abort(RuntimeError.create('cancelled')); });
    await assert.rejects(() => {
      const waiting = limiter.waitForToken('user-d', { 'signal': controller.signal });
      return waiting;
    });
  }

  static async 'wait-immediate'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'wait-immediate'>): Promise<void> {
    const limiter = KeyedRateLimiter.create(KeyedRateLimiterRunners.createConfig(scenarioCase.input.keyedRateLimiter, () => {return 0;}));
    await limiter.waitForToken('user-a');
    limiter.consume('user-a', scenarioCase.input.keyedRateLimiter.consumeTokens);
    assert.throws(() => { limiter.consume('user-a'); }, TokenBucketExhaustedError);
  }

  static async 'wait-refills-and-isolates'(scenarioCase: ScenarioCaseOfType<KeyedRateLimiterScenarioCaseEntity.Type, 'wait-refills-and-isolates'>): Promise<void> {
    let time = 0;
    const limiter = KeyedRateLimiter.create(KeyedRateLimiterRunners.createConfig(scenarioCase.input.keyedRateLimiter, () => {return time;}));
    limiter.consume('user-b');
    const advance = new Promise<void>((resolve) => {
      setImmediate(() => { time = scenarioCase.input.keyedRateLimiter.advanceTimeMs; resolve(); });
    });
    const wait = limiter.waitForToken('user-b');
    await Promise.all([advance, wait]);
    limiter.consume('user-c');
  }

  private static createConfig(raw: KeyedRateLimiterCreateConfigInterface, clock?: () => number): KeyedRateLimiterCreateConfigInterface {
    const result: KeyedRateLimiterCreateConfigInterface = {
      'burstSize': raw.burstSize,
      'requestsPerSecond': raw.requestsPerSecond,
      ...(raw.maximumKeys === undefined ? {} : { 'maximumKeys': raw.maximumKeys }),
      ...(raw.keyIdleTtlMs === undefined ? {} : { 'keyIdleTtlMs': raw.keyIdleTtlMs }),
      ...(clock === undefined ? {} : { 'clock': clock })
    };
    return result;
  }
}

ScenarioSuite.register({
  'entity': KeyedRateLimiterScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'keyed-rate-limiter',
  'runners': KeyedRateLimiterRunners
});

class MalformedStrategyScenarios {
  static withoutConsume(): FakeFixedAllowance {
    const strategy = new FakeFixedAllowance(1);
    Reflect.set(strategy, 'consume', undefined);
    return strategy;
  }

  static withoutWaitForToken(): FakeFixedAllowance {
    const strategy = new FakeFixedAllowance(1);
    Reflect.set(strategy, 'waitForToken', undefined);
    return strategy;
  }

  static assertRejectedWithoutRetention(build: () => FakeFixedAllowance): void {
    let factoryCalls = 0;
    const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
      'factory': () => {
        factoryCalls += 1;
        const result = build();
        return result;
      }
    });

    assert.throws(() => { limiter.consume('account'); }, KeyedRateLimiterBoundaryError);
    assert.throws(() => { limiter.consume('account'); }, KeyedRateLimiterBoundaryError);
    assert.equal(factoryCalls, 2);
  }
}

void describe('KeyedRateLimiter default TokenBucket demand boundaries', () => {
  const invalidTokenDemands: readonly number[] = [
    0,
    -1,
    Number.NaN,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY
  ];

  void it('forwards invalid demands without corrupting key capacity', async () => {
    for (let index = 0; index < invalidTokenDemands.length; index += 1) {
      const tokens = ScenarioValues.requireDefined(invalidTokenDemands[index], 'invalidTokenDemands[index]');
      const limiter = KeyedRateLimiter.create({ 'burstSize': 3, 'requestsPerSecond': 1 });

      assert.throws(() => { limiter.consume('account', tokens); }, KeyedRateLimiterBoundaryError);
      await assert.rejects(() => {
        const result = limiter.waitForToken('account', { 'tokens': tokens });
        return result;
      }, KeyedRateLimiterBoundaryError);
      assert.deepEqual(
        limiter.consume('account', 1.5),
        { 'consumedTokens': 1.5, 'remainingTokens': 1.5 }
      );
    }
  });
});


void describe('KeyedRateLimiter default TokenBucket configuration boundaries', () => {
  const invalidConfigurations: readonly KeyedRateLimiterCreateConfigInterface[] = [
    { 'burstSize': 1, 'requestsPerSecond': Number.NaN },
    { 'burstSize': 1, 'requestsPerSecond': Number.NEGATIVE_INFINITY },
    { 'burstSize': 1, 'requestsPerSecond': Number.POSITIVE_INFINITY },
    { 'burstSize': Number.NaN, 'requestsPerSecond': 1 },
    { 'burstSize': Number.NEGATIVE_INFINITY, 'requestsPerSecond': 1 },
    { 'burstSize': Number.POSITIVE_INFINITY, 'requestsPerSecond': 1 }
  ];

  void it('rejects non-finite TokenBucket configuration before a default strategy is created', () => {
    for (let index = 0; index < invalidConfigurations.length; index += 1) {
      const configuration = ScenarioValues.requireDefined(invalidConfigurations[index], 'invalidConfigurations[index]');
      assert.throws(() => { KeyedRateLimiter.create(configuration); }, KeyedRateLimiterConfigError);
    }
  });
});


void describe('KeyedRateLimiter unknown-property boundaries', () => {
  void it('rejects unrecognized default-bucket and registry properties at construction', () => {
    const defaultConfiguration = Object.assign(
      { 'burstSize': 1, 'requestsPerSecond': 1 },
      { 'unrecognizedDefaultOption': true }
    );
    const registryOptions = Object.assign(
      { 'maximumKeys': 1 },
      { 'unrecognizedRegistryOption': true }
    );
    const registryConfiguration = {
      'factory': (): FakeFixedAllowance => {return new FakeFixedAllowance(1);},
      ...registryOptions
    };

    assert.equal(KeyedRateLimiterDefaultOptionsEntity.validate(defaultConfiguration), false);
    assert.equal(KeyedRateLimiterRegistryOptionsEntity.validate(registryOptions), false);
    assert.throws(() => { KeyedRateLimiter.create(defaultConfiguration); }, KeyedRateLimiterConfigError);
    assert.throws(() => { KeyedRateLimiter.create(registryConfiguration); }, KeyedRateLimiterConfigError);
  });
});


void describe('KeyedRateLimiter clock boundaries', () => {
  void it('wraps invalid clock configuration in the keyed boundary error', () => {
    const configuration: KeyedRateLimiterCreateConfigInterface = {
      'burstSize': 1,
      'clock': (): number => {return 0;},
      'requestsPerSecond': 1
    };
    Reflect.set(configuration, 'clock', 0);
    assert.throws(() => {
      KeyedRateLimiter.create(configuration);
    }, (error: Error): boolean => {
      const result = error instanceof KeyedRateLimiterConfigError && error.cause instanceof ClockError;
      return result;
    });
  });

  void it('preserves the shared clock guard when a key creates its token bucket', () => {
    const limiter = KeyedRateLimiter.create({
      'burstSize': 1,
      'clock': (): number => {return Number.NaN;},
      'requestsPerSecond': 1
    });
    assert.throws(() => { limiter.consume('account'); }, (error: Error): boolean => {
      const result = error instanceof ClockError && error.cause instanceof ClockError;
      return result;
    });
  });
});


void describe('KeyedRateLimiter public request and strategy boundaries', () => {
  void it('rejects malformed keys and token demands before creating a strategy', async () => {
    const invalidKeys: readonly unknown[] = ['', 3, undefined];
    const invalidTokens: readonly number[] = [0, -1, Number.NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];

    for (let index = 0; index < invalidKeys.length; index += 1) {
      const key = invalidKeys[index];
      const limiter = KeyedRateLimiter.create({ 'burstSize': 3, 'requestsPerSecond': 1 });
      assert.strictEqual(RateLimitRequestEntity.validate({ 'key': key }), false);
      assert.deepEqual(limiter.consume('account'), { 'consumedTokens': 1, 'remainingTokens': 2 });
    }

    for (let index = 0; index < invalidTokens.length; index += 1) {
      const tokens = ScenarioValues.requireDefined(invalidTokens[index], 'invalidTokens[index]');
      const limiter = KeyedRateLimiter.create({ 'burstSize': 3, 'requestsPerSecond': 1 });
      assert.throws(() => { limiter.consume('account', tokens); }, KeyedRateLimiterBoundaryError);
      await assert.rejects(() => {
        const result = limiter.waitForToken('account', { 'tokens': tokens });
        return result;
      }, KeyedRateLimiterBoundaryError);
      assert.deepEqual(limiter.consume('account'), { 'consumedTokens': 1, 'remainingTokens': 2 });
    }
  });

  void it('rejects a malformed factory strategy without retaining it in the cache', () => {
    MalformedStrategyScenarios.assertRejectedWithoutRetention(() => {
      const result = MalformedStrategyScenarios.withoutConsume();
      return result;
    });
    MalformedStrategyScenarios.assertRejectedWithoutRetention(() => {
      const result = MalformedStrategyScenarios.withoutWaitForToken();
      return result;
    });
  });

  void it('rejects malformed consumption results from consume and waitForToken', async () => {
    const invalidConsumeStrategy = new FakeFixedAllowance(1);
    Reflect.set(invalidConsumeStrategy, 'consume', () => {return { 'remainingTokens': 0 };});
    const consumeLimiter = KeyedRateLimiter.create<FakeFixedAllowance>({
      'factory': () => {return invalidConsumeStrategy;}
    });
    assert.throws(() => { consumeLimiter.consume('account'); }, KeyedRateLimiterBoundaryError);

    const invalidWaitStrategy = new FakeFixedAllowance(1);
    Reflect.set(invalidWaitStrategy, 'waitForToken', () => {
      const result = Promise.resolve({ 'consumedTokens': 1 });
      return result;
    });
    const waitLimiter = KeyedRateLimiter.create<FakeFixedAllowance>({
      'factory': () => {return invalidWaitStrategy;}
    });
    await assert.rejects(() => {
      const result = waitLimiter.waitForToken('account');
      return result;
    }, KeyedRateLimiterBoundaryError);
  });
});
