---
"@studnicky/memoize": major
---

`Memoize` class composing `@studnicky/cache` (`LruCache`) and `@studnicky/concurrency` (`Coalesce`) into pure function memoization: LRU+TTL result caching keyed by a caller-supplied key derivation function, with in-flight call dedup.

`call(...args)` public API: returns the cached result for a repeat call whose `keyFn(...args)` matches a live cache entry without re-invoking the wrapped function; otherwise runs the wrapped function through the composed `Coalesce` so concurrent callers sharing the same derived key share one invocation, then caches the result.

Protected lifecycle hooks (`onMemoHit`, `onMemoMiss`, `onMemoCoalesced`) — `onMemoMiss`/`onMemoCoalesced` delegated from the internal `Coalesce` instance's `onCoalesceStart`/`onCoalesceJoin`, following the delegation technique `@studnicky/idempotency-guard`'s `IdempotencyGuard` uses for its own `onExecute`/`onCoalesce`.

`invalidate(...args)` evicts the cache entry for the derived key so the next matching call re-invokes the wrapped function; `clear()` evicts every cached entry.

`MemoizeConfigError`, extending the package-local `MemoizeError` base.

`MemoizeOptionsInterface<TArgs>` describes the callable key derivation and cache configuration contract.
