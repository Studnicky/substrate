import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TokenBucketExhaustedError } from '@studnicky/resilience';

import { KeyedRateLimiter } from '../../../src/index.js';
import {
  KeyedRateLimiterRegistryOptionsEntity,
  RateLimitRequestEntity
} from '../../../src/entities/index.js';
import type { KeyedRateLimiterCreateConfigInterface } from '../../../src/interfaces/index.js';

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

type FakeStrategyShape = {
  consume(tokens?: number): void;
  remaining: number;
  waitForToken(options?: { signal?: AbortSignal; tokens?: number }): Promise<void>;
};

class FakeFixedAllowance implements FakeStrategyShape {
  #remaining: number;

  constructor(allowance: number) {
    this.#remaining = allowance;
  }

  consume(tokens = 1): void {
    if (this.#remaining < tokens) {
      throw RuntimeError.create('fake allowance exhausted');
    }
    this.#remaining -= tokens;
  }

  async waitForToken(options?: { signal?: AbortSignal; tokens?: number }): Promise<void> {
    const tokens = options?.tokens ?? 1;
    this.consume(tokens);
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
  const config: KeyedRateLimiterCreateConfigInterface = {
    burstSize: Number(raw.burstSize),
    requestsPerSecond: Number(raw.requestsPerSecond)
  };

  if (raw.maximumKeys !== undefined) { config.maximumKeys = Number(raw.maximumKeys); }
  if (raw.keyIdleTtlMs !== undefined) { config.keyIdleTtlMs = Number(raw.keyIdleTtlMs); }
  if (clock !== undefined) { config.clock = clock; }

  return config;
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
            consume(): void {},
            waitForToken(): Promise<void> {
              return Promise.resolve();
            }
          };
        }
      });
      limiter.consume('user-e');
      limiter.consume('user-e');
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
      limiter.consume('user-a');
      limiter.consume('user-a');
      assert.throws(() => { limiter.consume('user-a'); });
      limiter.consume('user-b');
      return;
    },

    'generic-wait-for-token': async () => {
      const keyedRateLimiter = keyedRateLimiterInput(input);
      const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
        factory: () => new FakeFixedAllowance(Number(keyedRateLimiter.allowance))
      });
      await limiter.waitForToken('user-a');
      assert.throws(() => { limiter.consume('user-a'); });
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
      const acquired: Array<{ count: number; key: string }> = [];

      class ObservedTokenAcquiredLimiter extends KeyedRateLimiter {
        protected override onTokenAcquired(key: string, count: number): void {
          acquired.push({ count, key });
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
