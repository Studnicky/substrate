/**
 * KeyedRateLimiter.create generic-strategy Unit Tests
 *
 * Proves the RateLimiterStrategyInterface seam is genuinely structural: a
 * hand-written fake strategy object — no import of, or inheritance from,
 * TokenBucket — slots straight into KeyedRateLimiter without modification.
 */

import { deepStrictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import type { RateLimiterStrategyInterface } from '../../../src/index.js';

import { KeyedRateLimiter } from '../../../src/index.js';

/** A fake fixed-allowance strategy matching RateLimiterStrategyInterface by shape alone. */
class FakeFixedAllowance implements RateLimiterStrategyInterface {
  #remaining: number;

  constructor(allowance: number) {
    this.#remaining = allowance;
  }

  consume(tokens = 1): void {
    if (this.#remaining < tokens) {
      throw new Error('fake allowance exhausted');
    }
    this.#remaining -= tokens;
  }

  async waitForToken(options?: { 'signal'?: AbortSignal; 'tokens'?: number }): Promise<void> {
    const tokens = options?.tokens ?? 1;
    this.consume(tokens);
  }

  get remaining(): number {
    return this.#remaining;
  }
}

it('accepts a hand-written fake strategy that only structurally matches RateLimiterStrategyInterface', () => {
  const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
    'factory': (_key) => new FakeFixedAllowance(2)
  });

  limiter.consume('user-a');
  limiter.consume('user-a');
  throws(() => { limiter.consume('user-a'); });

  // key B is independent — its own fresh allowance
  limiter.consume('user-b');
});

it('waitForToken works through the generic strategy path too', async () => {
  const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
    'factory': (_key) => new FakeFixedAllowance(1)
  });

  await limiter.waitForToken('user-a');
  throws(() => { limiter.consume('user-a'); });
});

it('maxKeys/keyIdleTtlMs still bound the generic strategy path via the same LruCache', () => {
  const creations = new Map<string, number>();
  const limiter = KeyedRateLimiter.create<FakeFixedAllowance>({
    'factory': (key) => {
      creations.set(key, (creations.get(key) ?? 0) + 1);
      return new FakeFixedAllowance(5);
    },
    'maxKeys': 1
  });

  limiter.consume('user-a');
  limiter.consume('user-b'); // evicts user-a — capacity 1
  limiter.consume('user-a'); // creates a fresh strategy after eviction

  deepStrictEqual([...creations.entries()], [['user-a', 2], ['user-b', 1]]);
});
