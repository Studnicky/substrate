/**
 * KeyedRateLimiter.createWithStrategy Unit Tests
 *
 * Proves the RateLimiterStrategyType seam is genuinely structural: a
 * hand-written fake strategy object — no import of, or inheritance from,
 * TokenBucket — slots straight into KeyedRateLimiter without modification.
 */

import { deepStrictEqual, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import type { RateLimiterStrategyType } from '../../../src/index.js';

import { KeyedRateLimiter } from '../../../src/index.js';

/** A fake fixed-allowance strategy matching RateLimiterStrategyType by shape alone. */
class FakeFixedAllowance implements RateLimiterStrategyType {
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

it('accepts a hand-written fake strategy that only structurally matches RateLimiterStrategyType', () => {
  const limiter = KeyedRateLimiter.createWithStrategy<FakeFixedAllowance>({
    'factory': (_key) => new FakeFixedAllowance(2)
  });

  limiter.consume('user-a');
  limiter.consume('user-a');
  throws(() => { limiter.consume('user-a'); });

  // key B is independent — its own fresh allowance
  limiter.consume('user-b');
});

it('waitForToken works through the generic strategy path too', async () => {
  const limiter = KeyedRateLimiter.createWithStrategy<FakeFixedAllowance>({
    'factory': (_key) => new FakeFixedAllowance(1)
  });

  await limiter.waitForToken('user-a');
  strictEqual(limiter.getCache().get('user-a')?.remaining, 0);
});

it('maxKeys/keyIdleTtlMs still bound the generic strategy path via the same LruCache', () => {
  const limiter = KeyedRateLimiter.createWithStrategy<FakeFixedAllowance>({
    'factory': (_key) => new FakeFixedAllowance(5),
    'maxKeys': 1
  });

  limiter.consume('user-a');
  limiter.consume('user-b'); // evicts user-a — capacity 1

  deepStrictEqual(limiter.getCache().has('user-a'), false);
  deepStrictEqual(limiter.getCache().has('user-b'), true);
});
