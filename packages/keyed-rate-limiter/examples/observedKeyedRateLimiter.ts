/** observedKeyedRateLimiter — override onKeyCreated/onKeyEvicted/onLimitExceeded/onTokenAcquired to collect telemetry. Run: npx tsx examples/observedKeyedRateLimiter.ts */

// #region usage
import { TokenBucketExhaustedError } from '@studnicky/resilience';
import assert from 'node:assert/strict';

import type { RateLimiterStrategyType } from '../src/index.js';

import { KeyedRateLimiter } from '../src/index.js';

class FixedClock {
  static now(): number {
    const timestamp = 0;
    return timestamp;
  }
}

class TelemetryKeyedRateLimiter extends KeyedRateLimiter {
  readonly events: string[] = [];

  static tracked(): TelemetryKeyedRateLimiter {
    // Calling `create()` through the subclass reference (not
    // `KeyedRateLimiter.create()`) matters: `create()`/`createWithStrategy()`
    // use the polymorphic `new this(...)` idiom, so only a call routed
    // through `TelemetryKeyedRateLimiter` actually constructs one.
    const result = TelemetryKeyedRateLimiter.create({
      'burstSize': 2,
      'clock': FixedClock.now,
      'maxKeys': 2,
      'requestsPerSecond': 1
    }) as TelemetryKeyedRateLimiter;
    return result;
  }

  protected override onKeyCreated(key: string): void {
    console.log(`[keyed-rate-limiter] key created key=${key}`);
    this.events.push(`created:${key}`);
  }

  protected override onKeyEvicted(key: string): void {
    console.log(`[keyed-rate-limiter] key evicted key=${key}`);
    this.events.push(`evicted:${key}`);
  }

  protected override onLimitExceeded(key: string): void {
    console.log(`[keyed-rate-limiter] limit exceeded key=${key}`);
    this.events.push(`exceeded:${key}`);
  }

  protected override onTokenAcquired(key: string, count: number): void {
    console.log(`[keyed-rate-limiter] token acquired key=${key} count=${count}`);
    this.events.push(`acquired:${key}:${count}`);
  }
}

const limiter = TelemetryKeyedRateLimiter.tracked();

// Two independent keys — draining user-a does not touch user-b
limiter.consume('user-a');
limiter.consume('user-a');

try {
  limiter.consume('user-a'); // exhausted
} catch (error) {
  if (!(error instanceof TokenBucketExhaustedError)) { throw error; }
}

limiter.consume('user-b'); // unaffected by user-a's exhaustion

// maxKeys: 2 — a third key evicts the LRU tail (user-a)
limiter.consume('user-c');

console.log('Events:', limiter.events);

// The generic extension point: any object matching RateLimiterStrategyType
// slots in without a second wrapper class — no import of, or coupling to,
// TokenBucket required.
class FixedAllowance implements RateLimiterStrategyType {
  #remaining: number;
  constructor(allowance: number) { this.#remaining = allowance; }
  consume(tokens = 1): void {
    if (this.#remaining < tokens) { throw new Error('exhausted'); }
    this.#remaining -= tokens;
  }
  waitForToken(options?: { 'signal'?: AbortSignal; 'tokens'?: number }): Promise<void> {
    this.consume(options?.tokens ?? 1);
    return Promise.resolve();
  }
}

const genericLimiter = KeyedRateLimiter.createWithStrategy<FixedAllowance>({
  'factory': (_key) => {return new FixedAllowance(3);}
});

genericLimiter.consume('tenant-1', 3);
// #endregion usage

assert.deepEqual(limiter.events, [
  'created:user-a',
  'acquired:user-a:1',
  'acquired:user-a:1',
  'exceeded:user-a',
  'created:user-b',
  'acquired:user-b:1',
  // consuming user-c evicts the LRU tail (user-a) as part of the cache
  // insert, so onKeyEvicted fires before onKeyCreated for the new key.
  'evicted:user-a',
  'created:user-c',
  'acquired:user-c:1'
]);

assert.equal(limiter.getCache().has('user-a'), false);
assert.equal(limiter.getCache().has('user-b'), true);
assert.equal(limiter.getCache().has('user-c'), true);

console.log('observedKeyedRateLimiter: all assertions passed');
