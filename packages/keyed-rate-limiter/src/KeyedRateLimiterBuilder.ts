/**
 * Fluent builder for KeyedRateLimiter instances
 */

import type { TokenBucket } from '@studnicky/resilience';

import type { KeyedRateLimiter } from './KeyedRateLimiter.js';
import type { KeyedRateLimiterCreateConfigType } from './types/KeyedRateLimiterCreateConfigType.js';

import { KeyedRateLimiterConfigError } from './errors/index.js';

/**
 * Builder for the default `TokenBucket`-per-key `KeyedRateLimiter`. For the
 * generic `createWithStrategy()` extension point, call it directly — the
 * builder only covers the config shape `create()` accepts.
 *
 * @example
 * ```typescript
 * const limiter = KeyedRateLimiter.builder()
 *   .withRequestsPerSecond(10)
 *   .withBurstSize(20)
 *   .withMaxKeys(5000)
 *   .build();
 * ```
 */
export class KeyedRateLimiterBuilder {
  static create(create: (config: KeyedRateLimiterCreateConfigType) => KeyedRateLimiter<TokenBucket>): KeyedRateLimiterBuilder {
    return new KeyedRateLimiterBuilder(create);
  }

  readonly #create: (config: KeyedRateLimiterCreateConfigType) => KeyedRateLimiter<TokenBucket>;
  #burstSize?: number;
  #clock?: () => number;
  #keyIdleTtlMs?: number;
  #maxKeys?: number;
  #requestsPerSecond?: number;

  private constructor(create: (config: KeyedRateLimiterCreateConfigType) => KeyedRateLimiter<TokenBucket>) {
    this.#create = create;
  }

  /** Set the sustained refill rate applied to every per-key `TokenBucket`. */
  withRequestsPerSecond(value: number): this {
    this.#requestsPerSecond = value;
    return this;
  }

  /** Set the maximum burst capacity applied to every per-key `TokenBucket`. */
  withBurstSize(value: number): this {
    this.#burstSize = value;
    return this;
  }

  /** Set the maximum number of distinct keys retained at once. */
  withMaxKeys(value: number): this {
    this.#maxKeys = value;
    return this;
  }

  /** Set the time-to-live (ms) for an idle key's bucket before eviction. */
  withKeyIdleTtlMs(value: number): this {
    this.#keyIdleTtlMs = value;
    return this;
  }

  /** Set an injectable clock, forwarded to every per-key `TokenBucket`. */
  withClock(value: () => number): this {
    this.#clock = value;
    return this;
  }

  build(): KeyedRateLimiter<TokenBucket> {
    if (this.#requestsPerSecond === undefined) {
      throw new KeyedRateLimiterConfigError('requestsPerSecond is required');
    }
    if (this.#burstSize === undefined) {
      throw new KeyedRateLimiterConfigError('burstSize is required');
    }
    const config: KeyedRateLimiterCreateConfigType = {
      'burstSize': this.#burstSize,
      'requestsPerSecond': this.#requestsPerSecond,
      ...(this.#maxKeys !== undefined ? { 'maxKeys': this.#maxKeys } : {}),
      ...(this.#keyIdleTtlMs !== undefined ? { 'keyIdleTtlMs': this.#keyIdleTtlMs } : {}),
      ...(this.#clock !== undefined ? { 'clock': this.#clock } : {})
    };
    return this.#create(config);
  }
}
