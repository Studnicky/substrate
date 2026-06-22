/** Construction options for {@link LruCache}. */
export type LruCacheOptionsType = {
  'capacity': number;
  /** Optional key prefix prepended with `:` before all map operations. */
  'prefix'?: string;
  'ttlMs'?: number;
};
