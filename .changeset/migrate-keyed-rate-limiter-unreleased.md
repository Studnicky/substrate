---
"@studnicky/keyed-rate-limiter": major
---

`KeyedRateLimiter<TStrategy>` class composing `@studnicky/cache` (`LruCache`) and `@studnicky/resilience` (`TokenBucket`) into a per-key rate-limiting pattern: one strategy instance lazily created per key, idle keys evicted via LRU+TTL.

`RateLimiterStrategyInterface` — the structural seam (`consume(tokens?)` / `waitForToken(options?)`) `TokenBucket` matches without declaring it, and a future `SlidingWindowLimiter` (or any other algorithm) can slot into `create()` without a second wrapper class.

`KeyedRateLimiter.create(config)` accepts either the default `TokenBucket`-per-key configuration or a generic `RateLimiterStrategyInterface` factory configuration.

`consume(key, tokens?)` / `waitForToken(key, options?)` public API, lazily creating the per-key strategy on first use.

Protected lifecycle hooks (`onKeyCreated`, `onKeyEvicted`, `onLimitExceeded`, `onTokenAcquired`) — `onKeyEvicted` delegates from the internal `LruCache`'s own `onEvict`/`onExpire`/`onDelete` hooks. `onTokenAcquired` delegates from the per-key `TokenBucket` hook only for the default configuration because an arbitrary strategy has no structural hook surface.

`KeyedRateLimiterConfigError`, extending the package-local `KeyedRateLimiterError` base.
