import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

/** observedKeyedRateLimiter — enforce Northstar Books supplier-request budgets while recording per-supplier telemetry. Run: npx tsx examples/observedKeyedRateLimiter.ts */
// #region usage
import type { RateLimitConsumptionEntity } from '../src/entities/RateLimitConsumptionEntity.js';
import type { RateLimitConsumptionInterface } from '../src/interfaces/RateLimitConsumptionInterface.js';
import type { RateLimiterStrategyInterface } from '../src/keyed/index.js';
import type { KeyedRateLimiterCreateConfigInterface } from '../src/keyed/interfaces/index.js';

import { KeyedRateLimiter } from '../src/keyed/index.js';
import { TokenBucketExhaustedError } from '../src/TokenBucketExhaustedError.js';

const telemetryEvents: string[] = [];

class TelemetryKeyedRateLimiter extends KeyedRateLimiter {
  static build(config: KeyedRateLimiterCreateConfigInterface): TelemetryKeyedRateLimiter {
    return new TelemetryKeyedRateLimiter(super.createDefaultDependencies(config));
  }
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

const limiter = TelemetryKeyedRateLimiter.build({
  'burstSize': 2,
  'clock': () => {
    const epoch = new Date(0);
    const result = epoch.getTime();
    return result;
  },
  'maximumKeys': 2,
  'requestsPerSecond': 1
});

// Two suppliers have independent request budgets.
limiter.consume('supplier:paper-trail');
limiter.consume('supplier:paper-trail');

try {
  limiter.consume('supplier:paper-trail'); // exhausted
} catch (error) {
  if (!(error instanceof TokenBucketExhaustedError)) { throw error; }
}

limiter.consume('supplier:archive-house'); // unaffected by user-a's exhaustion

// maximumKeys: 2 — a third supplier evicts the least-recently-used budget.
limiter.consume('supplier:rare-leaf');

console.log('Events:', telemetryEvents);

// The generic extension point: any object matching RateLimiterStrategyInterface
// slots in without a second wrapper class — no import of, or coupling to,
// TokenBucket required.
class FixedAllowance implements RateLimiterStrategyInterface {
  #remaining: number;
  constructor(allowance: number) { this.#remaining = allowance; }
  consume(tokens = 1): RateLimitConsumptionInterface {
    if (this.#remaining < tokens) { throw RuntimeError.create('exhausted'); }
    this.#remaining -= tokens;
    return { 'consumedTokens': tokens, 'remainingTokens': this.#remaining };
  }
  waitForToken(
    options?: { 'signal'?: AbortSignal; 'tokens'?: number }
  ): Promise<RateLimitConsumptionInterface> {
    const result = Promise.resolve(this.consume(options?.tokens ?? 1));
    return result;
  }
}

const genericLimiter = KeyedRateLimiter.create<FixedAllowance>({
  'factory': (_key) => {return new FixedAllowance(3);}
});

genericLimiter.consume('supplier:advance-reader-copy', 3);
// #endregion usage

assert.deepEqual(telemetryEvents, [
  'created:supplier:paper-trail',
  'acquired:supplier:paper-trail:1:1',
  'acquired:supplier:paper-trail:1:0',
  'exceeded:supplier:paper-trail',
  'created:supplier:archive-house',
  'acquired:supplier:archive-house:1:1',
  // consuming user-c evicts the LRU tail (user-a) as part of the cache
  // insert, so onKeyEvicted fires before onKeyCreated for the new key.
  'evicted:supplier:paper-trail',
  'created:supplier:rare-leaf',
  'acquired:supplier:rare-leaf:1:1'
]);

console.log('observedKeyedRateLimiter: all assertions passed');
