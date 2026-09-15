import type { TokenBucketOptionsInterface } from '@studnicky/resilience/interfaces';

import type { KeyedRateLimiterRegistryOptionsEntity } from '../entities/KeyedRateLimiterRegistryOptionsEntity.js';

/** Construction options for {@link KeyedRateLimiter}'s default `TokenBucket`-per-key path. */
export interface KeyedRateLimiterCreateConfigInterface extends TokenBucketOptionsInterface {
  /** Time-to-live (ms) for an idle key's bucket before it is evicted from the cache. */
  'keyIdleTtlMs'?: KeyedRateLimiterRegistryOptionsEntity.Type['keyIdleTtlMs'];
  /** Maximum number of distinct keys retained at once. Defaults to 10,000. */
  'maximumKeys'?: KeyedRateLimiterRegistryOptionsEntity.Type['maximumKeys'];
}
