/** Construction options for {@link Memoize}. */
export type MemoizeOptionsType<TArgs extends unknown[]> = {
  /** Maximum number of distinct derived keys retained at once (composed `LruCache` capacity). */
  'capacity': number;
  /**
   * Derives the cache/coalesce key for a call from its arguments. Required —
   * mirrors `LruCache`'s explicit-key model rather than an implicit tuple
   * hash, which is unsound for object/function arguments.
   */
  'keyFn': (...args: TArgs) => string;
  /** Staleness threshold (ms) for a cached entry, passed straight through to the composed `LruCache`. */
  'staleMs'?: number;
  /** Time-to-live (ms) for a cached entry, passed straight through to the composed `LruCache`. */
  'ttlMs'?: number;
};
