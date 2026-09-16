import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ResilienceConfigError, TokenBucketExhaustedError } from '@studnicky/resilience/node';

import type { RateLimitConsumptionEntity } from '@studnicky/resilience/entities';

import { KeyedRateLimiter, KeyedRateLimiterBoundaryError, KeyedRateLimiterConfigError } from '../../../src/index.js';
import {
  KeyedRateLimiterDefaultOptionsEntity,
  KeyedRateLimiterRegistryOptionsEntity,
  RateLimitRequestEntity
} from '../../../src/entities/index.js';
import type { KeyedRateLimiterCreateConfigInterface, RateLimiterStrategyInterface } from '../../../src/interfaces/index.js';

type ScenarioCase = {
  description: string;
  expected: Record<string, unknown>;
  input: ScenarioInput;
  shape: string;
  name: string;
};

type ScenarioInput = {
  keyedRateLimiter?: Record<string, unknown>;
  rateLimitRequest?: Record<string, unknown>;
  registry?: Record<string, unknown>;
};

class TrackingEvictionLimiter extends KeyedRateLimiter {
  readonly created: string[] = [];
  readonly evicted: string[] = [];

  protected override onKeyCreated(key: string): void {
    this.created.push(key);
  }

  protected override onKeyEvicted(key: string): void {
    this.evicted.push(key);
  }
}

import scenarioGroups from './keyed-rate-limiter.scenarios.json' with { type: 'json' };

class TrackingLimiter extends KeyedRateLimiter {
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

  consume(tokens = 1): RateLimitConsumptionEntity.Type {
    if (this.#remaining < tokens) {
      throw RuntimeError.create('fake allowance exhausted');
    }
    this.#remaining -= tokens;
    return { 'consumedTokens': tokens, 'remainingTokens': this.#remaining };
  }

  async waitForToken(
    options?: { signal?: AbortSignal; tokens?: number }
  ): Promise<RateLimitConsumptionEntity.Type> {
    const tokens = options?.tokens ?? 1;
    return this.consume(tokens);
  }

  get remaining(): number {
    return this.#remaining;
  }
}

function keyedRateLimiterInput(input: ScenarioInput): Record<string, unknown> {
  if (input.keyedRateLimiter === undefined) {
    throw RuntimeError.create('Scenario input must provide keyedRateLimiter');
  }

  return input.keyedRateLimiter;
}

function registryInput(input: ScenarioInput): Record<string, unknown> {
  if (input.registry === undefined) {
    throw RuntimeError.create('Scenario input must provide registry');
  }

  return input.registry;
}

function rateLimitRequestInput(input: ScenarioInput): Record<string, unknown> {
  if (input.rateLimitRequest === undefined) {
    throw RuntimeError.create('Scenario input must provide rateLimitRequest');
  }

  return input.rateLimitRequest;
}

function keyedRateLimiterConfig(input: ScenarioInput, clock?: () => number): KeyedRateLimiterCreateConfigInterface {
  const raw = keyedRateLimiterInput(input);
  return {
    burstSize: Number(raw.burstSize),
    requestsPerSecond: Number(raw.requestsPerSecond),
    ...(raw.maximumKeys === undefined ? {} : { maximumKeys: Number(raw.maximumKeys) }),
    ...(raw.keyIdleTtlMs === undefined ? {} : { keyIdleTtlMs: Number(raw.keyIdleTtlMs) }),
    ...(clock === undefined ? {} : { clock })
  };
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const { expected, input, shape } = scenarioCase;

  const runnerMap: Record<ScenarioCase['shape'], () => Promise<void> | void> = {
    'entities-valid': () => {
      assert.equal(KeyedRateLimiterRegistryOptionsEntity.validate(registryInput(input)), expected.accepted);
      assert.equal(RateLimitRequestEntity.validate(rateLimitRequestInput(input)), expected.accepted);
      return;
    },

    'entities-invalid': () => {
      assert.equal(KeyedRateLimiterRegistryOptionsEntity.validate(registryInput(input)), expected.accepted);
      assert.equal(RateLimitRequestEntity.validate(rateLimitRequestInput(input)), expected.accepted);
      return;
    },

    'consume-independent-keys': () => {
      const limiter = KeyedRateLimiter.create(keyedRateLimiterConfig(input, () => 0));
      limiter.consume('user-a');
      assert.throws(() => { limiter.consume('user-a'); }, TokenBucketExhaustedError);
      limiter.consume('user-b');
      return;
    },

    'consume-same-key-exhausts': () => {
      const limiter = KeyedRateLimiter.create(keyedRateLimiterConfig(input, () => 0));
      limiter.consume('user-c');
      limiter.consume('user-c');
      assert.throws(() => { limiter.consume('user-c'); }, TokenBucketExhaustedError);
      return;
    },

    'consume-requested-tokens': () => {
      const limiter = KeyedRateLimiter.create(keyedRateLimiterConfig(input, () => 0));
      limiter.consume('user-d', 5);
      assert.throws(() => { limiter.consume('user-d', 1); }, TokenBucketExhaustedError);
      return;
    },

    'consume-strategy-created-once': () => {
      let factoryCalls = 0;
      const limiter = KeyedRateLimiter.create({
        factory: () => {
          factoryCalls += 1;
          return {
            consume(): RateLimitConsumptionEntity.Type {
              return { 'consumedTokens': 1, 'remainingTokens': 0 };
            },
            waitForToken(): Promise<RateLimitConsumptionEntity.Type> {
              return Promise.resolve({ 'consumedTokens': 1, 'remainingTokens': 0 });
            }
          };
        }
      });
      const firstResult = limiter.consume('user-e');
      const secondResult = limiter.consume('user-e');
      assert.deepEqual(firstResult, expected.result);
      assert.deepEqual(secondResult, expected.result);
      assert.equal(factoryCalls, expected.factoryCalls);
      return;
    },

    'getters-eviction-on-max-keys': () => {
      const limiter = TrackingLimiter.create(keyedRateLimiterConfig(input, () => 0));
      limiter.consume('user-a');
      limiter.consume('user-b');
      limiter.consume('user-c');
      limiter.consume('user-d');
      assert.deepEqual(limiter.evicted, expected.evicted);
      return;
    },

    'generic-fake-strategy': () => {
      const keyedRateLimiter = keyedRateLimiterInput(input);
      const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
        factory: () => new FakeFixedAllowance(Number(keyedRateLimiter.allowance))
      });
      const firstResult = limiter.consume('user-a');
      const secondResult = limiter.consume('user-a');
      assert.deepEqual(firstResult, expected.firstResult);
      assert.deepEqual(secondResult, expected.secondResult);
      assert.throws(() => { limiter.consume('user-a'); });
      limiter.consume('user-b');
      return;
    },

    'generic-wait-for-token': async () => {
      const keyedRateLimiter = keyedRateLimiterInput(input);
      const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
        factory: () => new FakeFixedAllowance(Number(keyedRateLimiter.allowance))
      });
      const result = await limiter.waitForToken('user-a');
      assert.deepEqual(result, expected.result);
      assert.throws(() => { limiter.consume('user-a'); });
      return;
    },

    'generic-fractional-consumption-result': () => {
      const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
        factory: () => new FakeFixedAllowance(2)
      });
      const result = limiter.consume('user-fractional', 1.5);
      assert.deepEqual(result, expected.result);
      return;
    },

    'generic-acquisition-observation': async () => {
      const acquired: Array<{ key: string; result: RateLimitConsumptionEntity.Type }> = [];

      class ObservedGenericLimiter extends KeyedRateLimiter<FakeFixedAllowance> {
        protected override onTokenAcquired(
          key: string,
          result: RateLimitConsumptionEntity.Type
        ): void {
          acquired.push({ key, result });
        }
      }

      const limiter = ObservedGenericLimiter.create<FakeFixedAllowance>({
        factory: () => new FakeFixedAllowance(2)
      });
      limiter.consume('user-a');
      await limiter.waitForToken('user-a');
      assert.deepEqual(acquired, expected.acquired);
      return;
    },

    'generic-cache-boundary': () => {
      const keyedRateLimiter = keyedRateLimiterInput(input);
      const creations = new Map<string, number>();
      const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
        factory: (key) => {
          creations.set(key, (creations.get(key) ?? 0) + 1);
          return new FakeFixedAllowance(Number(keyedRateLimiter.allowance));
        },
        maximumKeys: Number(keyedRateLimiter.maximumKeys)
      });
      limiter.consume('user-a');
      limiter.consume('user-b');
      limiter.consume('user-a');
      assert.deepEqual([...creations.entries()], expected.creations);
      return;
    },

    'consume-default-result': () => {
      const keyedRateLimiter = keyedRateLimiterInput(input);
      const limiter = KeyedRateLimiter.create(keyedRateLimiterConfig(input, () => 0));
      const result = limiter.consume('user-result', Number(keyedRateLimiter.tokens));
      assert.deepEqual(result, expected.result);
      return;
    },

    'wait-immediate': async () => {
      const keyedRateLimiter = keyedRateLimiterInput(input);
      const limiter = KeyedRateLimiter.create(keyedRateLimiterConfig(input, () => 0));
      await limiter.waitForToken('user-a');
      limiter.consume('user-a', Number(keyedRateLimiter.consumeTokens));
      assert.throws(() => { limiter.consume('user-a'); }, TokenBucketExhaustedError);
      return;
    },

    'wait-refills-and-isolates': async () => {
      const keyedRateLimiter = keyedRateLimiterInput(input);
      let time = 0;
      const clock = (): number => time;
      const limiter = KeyedRateLimiter.create(keyedRateLimiterConfig(input, clock));
      limiter.consume('user-b');
      const advance = new Promise<void>((resolve) => {
        setImmediate(() => { time = Number(keyedRateLimiter.advanceTimeMs); resolve(); });
      });
      const wait = limiter.waitForToken('user-b');
      await Promise.all([advance, wait]);
      limiter.consume('user-c');
      return;
    },

    'wait-abort-signal': async () => {
      const controller = new AbortController();
      const limiter = KeyedRateLimiter.create(keyedRateLimiterConfig(input, () => 0));
      limiter.consume('user-d');
      setImmediate(() => { controller.abort(RuntimeError.create('cancelled')); });
      await assert.rejects(() => limiter.waitForToken('user-d', { signal: controller.signal }));
      return;
    },

    'evicts-idle-key-at-capacity': () => {
      const limiter = TrackingEvictionLimiter.create(keyedRateLimiterConfig(input, () => 0));
      limiter.consume('user-a');
      limiter.consume('user-b');
      limiter.consume('user-c');
      assert.deepEqual(limiter.created, expected.created);
      assert.deepEqual(limiter.evicted, expected.evicted);
      return;
    },

    'recreates-strategy-after-eviction': () => {
      const limiter = TrackingEvictionLimiter.create(keyedRateLimiterConfig(input, () => 0));
      limiter.consume('user-a');
      limiter.consume('user-b');
      limiter.consume('user-c');
      limiter.consume('user-a');
      assert.deepEqual(limiter.created, expected.created);
      assert.deepEqual(limiter.evicted, expected.evicted);
      return;
    },

    'idle-key-expires-and-rebuilds': async () => {
      const keyedRateLimiter = keyedRateLimiterInput(input);
      const limiter = TrackingEvictionLimiter.create(keyedRateLimiterConfig(input));
      limiter.consume('user-a');
      await new Promise<void>((resolve) => { setTimeout(resolve, Number(keyedRateLimiter.waitMs)); });
      limiter.consume('user-a');
      assert.deepEqual(limiter.evicted, expected.evicted);
      assert.deepEqual(limiter.created, expected.created);
      return;
    },

    'throwing-on-key-evicted': () => {
      class ThrowingEvictedLimiter extends KeyedRateLimiter {
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

      const limiter = ThrowingEvictedLimiter.create(keyedRateLimiterConfig(input, () => 0));
      limiter.consume('user-a');
      limiter.consume('user-b');
      limiter.consume('user-c');
      limiter.consume('user-a');
      assert.deepEqual(limiter.created, expected.created);
      assert.deepEqual(limiter.evicted, expected.evicted);
      return;
    },

    'on-token-acquired': () => {
      const acquired: Array<{ key: string; result: RateLimitConsumptionEntity.Type }> = [];

      class ObservedTokenAcquiredLimiter extends KeyedRateLimiter {
        protected override onTokenAcquired(key: string, result: RateLimitConsumptionEntity.Type): void {
          acquired.push({ key, result });
        }
      }

      const limiter = ObservedTokenAcquiredLimiter.create(keyedRateLimiterConfig(input, () => 0));
      limiter.consume('user-a', 1);
      limiter.consume('user-a', 1);
      assert.deepStrictEqual(acquired, expected.acquired);
      return;
    }
  };

  const runner = runnerMap[shape];
  if (runner === undefined) {
    throw RuntimeError.create(`No runner registered for shape: ${shape}`);
  }
  await runner();
}

void describe('keyed-rate-limiter', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});

void describe('KeyedRateLimiter default TokenBucket demand boundaries', () => {
  const invalidTokenDemands: readonly number[] = [
    0,
    -1,
    Number.NaN,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY
  ];

  void it('forwards invalid demands without corrupting key capacity', async () => {
    for (const tokens of invalidTokenDemands) {
      const limiter = KeyedRateLimiter.create({ 'burstSize': 3, 'requestsPerSecond': 1 });

      assert.throws(() => { limiter.consume('account', tokens); }, KeyedRateLimiterBoundaryError);
      await assert.rejects(() => limiter.waitForToken('account', { 'tokens': tokens }), KeyedRateLimiterBoundaryError);
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
    for (const configuration of invalidConfigurations) {
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
      'factory': (): FakeFixedAllowance => new FakeFixedAllowance(1),
      ...registryOptions
    };

    assert.equal(KeyedRateLimiterDefaultOptionsEntity.validate(defaultConfiguration), false);
    assert.equal(KeyedRateLimiterRegistryOptionsEntity.validate(registryOptions), false);
    assert.throws(() => { KeyedRateLimiter.create(defaultConfiguration); }, KeyedRateLimiterConfigError);
    assert.throws(() => { KeyedRateLimiter.create(registryConfiguration); }, KeyedRateLimiterConfigError);
  });
});


void describe("KeyedRateLimiter clock boundaries", () => {
  void it("validates a default clock before forwarding it to token buckets", () => {
    const invalidConfiguration = { "burstSize": 1, "clock": 0, "requestsPerSecond": 1 };
    assert.throws(() => {
      Reflect.apply(KeyedRateLimiter.create, KeyedRateLimiter, [invalidConfiguration]);
    }, KeyedRateLimiterConfigError);
  });

  void it("preserves the shared clock guard when a key creates its token bucket", () => {
    const limiter = KeyedRateLimiter.create({
      "burstSize": 1,
      "clock": (): number => Number.NaN,
      "requestsPerSecond": 1
    });
    assert.throws(() => { limiter.consume("account"); }, ResilienceConfigError);
  });
});


void describe('KeyedRateLimiter public request and strategy boundaries', () => {
  void it('rejects malformed keys and token demands before creating a strategy', async () => {
    const invalidKeys: readonly unknown[] = ['', 3, undefined];
    const invalidTokens: readonly number[] = [0, -1, Number.NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];

    for (const key of invalidKeys) {
      const limiter = KeyedRateLimiter.create({ 'burstSize': 3, 'requestsPerSecond': 1 });
      assert.throws(() => { Reflect.apply(limiter.consume, limiter, [key]); }, KeyedRateLimiterBoundaryError);
      await assert.rejects(() => Reflect.apply(limiter.waitForToken, limiter, [key]), KeyedRateLimiterBoundaryError);
      assert.deepEqual(limiter.consume('account'), { 'consumedTokens': 1, 'remainingTokens': 2 });
    }

    for (const tokens of invalidTokens) {
      const limiter = KeyedRateLimiter.create({ 'burstSize': 3, 'requestsPerSecond': 1 });
      assert.throws(() => { limiter.consume('account', tokens); }, KeyedRateLimiterBoundaryError);
      await assert.rejects(() => limiter.waitForToken('account', { 'tokens': tokens }), KeyedRateLimiterBoundaryError);
      assert.deepEqual(limiter.consume('account'), { 'consumedTokens': 1, 'remainingTokens': 2 });
    }
  });

  void it('rejects a malformed factory strategy without retaining it in the cache', () => {
    const invalidMethods = ['consume', 'waitForToken'];

    for (const invalidMethod of invalidMethods) {
      let factoryCalls = 0;
      const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
        factory: () => {
          factoryCalls += 1;
          const strategy = new FakeFixedAllowance(1);
          Reflect.set(strategy, invalidMethod, undefined);
          return strategy;
        }
      });

      assert.throws(() => { limiter.consume('account'); }, KeyedRateLimiterBoundaryError);
      assert.throws(() => { limiter.consume('account'); }, KeyedRateLimiterBoundaryError);
      assert.equal(factoryCalls, 2);
    }
  });

  void it('rejects malformed consumption results from consume and waitForToken', async () => {
    const invalidConsumeStrategy = new FakeFixedAllowance(1);
    Reflect.set(invalidConsumeStrategy, 'consume', () => ({ 'remainingTokens': 0 }));
    const consumeLimiter = KeyedRateLimiter.create<FakeFixedAllowance>({
      factory: () => invalidConsumeStrategy
    });
    assert.throws(() => { consumeLimiter.consume('account'); }, KeyedRateLimiterBoundaryError);

    const invalidWaitStrategy = new FakeFixedAllowance(1);
    Reflect.set(invalidWaitStrategy, 'waitForToken', async () => ({ 'consumedTokens': 1 }));
    const waitLimiter = KeyedRateLimiter.create<FakeFixedAllowance>({
      factory: () => invalidWaitStrategy
    });
    await assert.rejects(() => waitLimiter.waitForToken('account'), KeyedRateLimiterBoundaryError);
  });
});
