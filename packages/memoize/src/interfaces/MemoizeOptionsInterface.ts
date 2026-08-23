import type { LruCacheOptionsEntity } from '@studnicky/cache';

/** Construction options for {@link Memoize}. */
export interface MemoizeOptionsInterface<TArgumentList extends unknown[]> {
  /** Maximum number of distinct derived keys retained at once. */
  'capacity': LruCacheOptionsEntity.Type['capacity'];
  /** Derives the cache and coalesce key for a call from its arguments. */
  'keyDeriver': (...argumentList: TArgumentList) => string;
  /** Staleness threshold in milliseconds for a cached entry. */
  'staleMs'?: LruCacheOptionsEntity.Type['staleMs'];
  /** Time-to-live in milliseconds for a cached entry. */
  'ttlMs'?: LruCacheOptionsEntity.Type['ttlMs'];
}
