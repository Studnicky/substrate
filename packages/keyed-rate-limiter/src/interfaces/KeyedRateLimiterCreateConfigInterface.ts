import type { TokenBucketOptionsEntity } from '@studnicky/resilience';

import type { KeyedRateLimiterRegistryOptionsEntity } from '../entities/KeyedRateLimiterRegistryOptionsEntity.js';

/** Construction options for {@link KeyedRateLimiter}'s default `TokenBucket`-per-key path. */
export interface KeyedRateLimiterCreateConfigInterface {
  /** Maximum burst capacity applied to every per-key `TokenBucket`. */
  'burstSize': TokenBucketOptionsEntity.Type['burstSize'];
  /** Injectable clock, forwarded to every per-key `TokenBucket` for deterministic testing. */
  'clock'?: () => number;
  /** Time-to-live (ms) for an idle key's bucket before it is evicted from the cache. */
  'keyIdleTtlMs'?: KeyedRateLimiterRegistryOptionsEntity.Type['keyIdleTtlMs'];
  /** Maximum number of distinct keys retained at once. Defaults to 10,000. */
  'maxKeys'?: KeyedRateLimiterRegistryOptionsEntity.Type['maxKeys'];
  /** Sustained refill rate applied to every per-key `TokenBucket`. */
  'requestsPerSecond': TokenBucketOptionsEntity.Type['requestsPerSecond'];
}
