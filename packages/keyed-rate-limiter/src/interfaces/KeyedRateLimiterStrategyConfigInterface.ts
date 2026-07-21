import type { KeyedRateLimiterRegistryOptionsEntity } from '../entities/KeyedRateLimiterRegistryOptionsEntity.js';
import type { RateLimiterStrategyInterface } from './RateLimiterStrategyInterface.js';

/** Construction options for {@link KeyedRateLimiter}'s generic strategy path. */
export interface KeyedRateLimiterStrategyConfigInterface<
  TStrategy extends RateLimiterStrategyInterface
> {
  /** Produces a strategy when a key is first seen or re-seen after eviction. */
  'factory': (key: string) => TStrategy;
  /** Time-to-live (ms) for an idle key's strategy before cache eviction. */
  'keyIdleTtlMs'?: KeyedRateLimiterRegistryOptionsEntity.Type['keyIdleTtlMs'];
  /** Maximum number of distinct keys retained at once. Defaults to 10,000. */
  'maxKeys'?: KeyedRateLimiterRegistryOptionsEntity.Type['maxKeys'];
}
