/** observedKeyedRateLimiter — override onKeyCreated/onKeyEvicted/onLimitExceeded/onTokenAcquired to collect telemetry. Run: npx tsx examples/observedKeyedRateLimiter.ts */
// #region usage
import type { RateLimitConsumptionEntity } from '@studnicky/resilience/entities';

import { RuntimeError } from '@studnicky/errors/node';
import { TokenBucketExhaustedError } from '@studnicky/resilience/node';
import assert from 'node:assert/strict';

import type { RateLimiterStrategyInterface } from '../src/index.js';

import { KeyedRateLimiter } from '../src/index.js';

const telemetryEvents: string[] = [];

class TelemetryKeyedRateLimiter extends KeyedRateLimiter {
  protected override onKeyCreated(key: string): void {
    console.log(`[keyed-rate-limiter] key created key=${key}`);
    telemetryEvents.push(`created:${key}`);
  }

  protected override onKeyEvicted(key: string): void {
    console.log(`[keyed-rate-limiter] key evicted key=${key}`);
    telemetryEvents.push(`evicted:${key}`);
  }

  protected override onLimitExceeded(key: string): void {
    console.log(`[keyed-rate-limiter] limit exceeded key=${key}`);
    telemetryEvents.push(`exceeded:${key}`);
  }

  protected override onTokenAcquired(
    key: string,
    result: RateLimitConsumptionEntity.Type
  ): void {
    console.log(
      `[keyed-rate-limiter] token acquired key=${key} consumed=${result.consumedTokens} remaining=${result.remainingTokens}`
    );
    telemetryEvents.push(`acquired:${key}:${result.consumedTokens}:${result.remainingTokens}`);
  }
}

const limiter = TelemetryKeyedRateLimiter.create({
  'burstSize': 2,
  'clock': () => {
    const epoch = new Date(0);
    const result = epoch.getTime();
    return result;
  },
  'maximumKeys': 2,
  'requestsPerSecond': 1
});

// Two independent keys — draining user-a does not touch user-b
limiter.consume('user-a');
limiter.consume('user-a');

try {
  limiter.consume('user-a'); // exhausted
} catch (error) {
  if (!(error instanceof TokenBucketExhaustedError)) { throw error; }
}

limiter.consume('user-b'); // unaffected by user-a's exhaustion

// maximumKeys: 2 — a third key evicts the LRU tail (user-a)
limiter.consume('user-c');

console.log('Events:', telemetryEvents);

// The generic extension point: any object matching RateLimiterStrategyInterface
// slots in without a second wrapper class — no import of, or coupling to,
// TokenBucket required.
class FixedAllowance implements RateLimiterStrategyInterface {
  #remaining: number;
  constructor(allowance: number) { this.#remaining = allowance; }
  consume(tokens = 1): RateLimitConsumptionEntity.Type {
    if (this.#remaining < tokens) { throw RuntimeError.create('exhausted'); }
    this.#remaining -= tokens;
    return { 'consumedTokens': tokens, 'remainingTokens': this.#remaining };
  }
  waitForToken(
    options?: { 'signal'?: AbortSignal; 'tokens'?: number }
  ): Promise<RateLimitConsumptionEntity.Type> {
    const result = Promise.resolve(this.consume(options?.tokens ?? 1));
    return result;
  }
}

const genericLimiter = KeyedRateLimiter.create<FixedAllowance>({
  'factory': (_key) => {return new FixedAllowance(3);}
});

genericLimiter.consume('tenant-1', 3);
// #endregion usage

assert.deepEqual(telemetryEvents, [
  'created:user-a',
  'acquired:user-a:1:1',
  'acquired:user-a:1:0',
  'exceeded:user-a',
  'created:user-b',
  'acquired:user-b:1:1',
  // consuming user-c evicts the LRU tail (user-a) as part of the cache
  // insert, so onKeyEvicted fires before onKeyCreated for the new key.
  'evicted:user-a',
  'created:user-c',
  'acquired:user-c:1:1'
]);

console.log('observedKeyedRateLimiter: all assertions passed');
