// json-schema-uninexpressible: 'clock' is a function type (injectable clock override), not representable
// in JSON Schema — the rest of this shape is plain data but the field disqualifies the whole literal.
/** Construction options for {@link KeyedRateLimiter}'s `create()` — the default, `TokenBucket`-per-key path. */
export type KeyedRateLimiterCreateConfigType = {
  /** Maximum burst capacity applied to every per-key `TokenBucket`. */
  'burstSize': number;
  /** Injectable clock, forwarded to every per-key `TokenBucket` for deterministic testing. */
  'clock'?: () => number;
  /** Time-to-live (ms) for an idle key's bucket before it is evicted from the cache. */
  'keyIdleTtlMs'?: number;
  /** Maximum number of distinct keys retained at once (LRU-evicted beyond this). Defaults to 10,000. */
  'maxKeys'?: number;
  /** Sustained refill rate applied to every per-key `TokenBucket`. */
  'requestsPerSecond': number;
};
