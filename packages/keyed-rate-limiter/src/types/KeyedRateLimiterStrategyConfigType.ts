import type { RateLimiterStrategyType } from '../RateLimiterStrategyType.js';

// json-schema-uninexpressible: generic over TStrategy, and 'factory' is a function type — neither
// has a JSON Schema representation.
/** Construction options for {@link KeyedRateLimiter}'s `createWithStrategy()` — the generic-algorithm extension point. */
export type KeyedRateLimiterStrategyConfigType<TStrategy extends RateLimiterStrategyType> = {
  /** Produces a new per-key strategy instance the first time a given key is seen (or re-seen after eviction). */
  'factory': (key: string) => TStrategy;
  /** Time-to-live (ms) for an idle key's strategy before it is evicted from the cache. */
  'keyIdleTtlMs'?: number;
  /** Maximum number of distinct keys retained at once (LRU-evicted beyond this). Defaults to 10,000. */
  'maxKeys'?: number;
};
