# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `KeyedRateLimiter<TStrategy>` class composing `@studnicky/cache` (`LruCache`) and `@studnicky/resilience` (`TokenBucket`) into a per-key rate-limiting pattern: one strategy instance lazily created per key, idle keys evicted via LRU+TTL.
- `RateLimiterStrategyType` — the structural seam (`consume(tokens?)` / `waitForToken(options?)`) `TokenBucket` matches without declaring it, and a future `SlidingWindowLimiter` (or any other algorithm) can slot into `createWithStrategy()` without a second wrapper class.
- `KeyedRateLimiter.create(config)` — default `TokenBucket`-per-key path; `KeyedRateLimiter.createWithStrategy(config)` — generic extension point over any `RateLimiterStrategyType`-shaped factory.
- `consume(key, tokens?)` / `waitForToken(key, options?)` public API, lazily creating the per-key strategy on first use.
- Protected lifecycle hooks (`onKeyCreated`, `onKeyEvicted`, `onLimitExceeded`, `onTokenAcquired`) — `onKeyEvicted` delegated from the internal `LruCache`'s own `onEvict`/`onExpire`/`onDelete` hooks, following the delegation technique `@studnicky/paginator`'s `Paginator` and `@studnicky/idempotency-guard`'s `IdempotencyGuard` use for their own internally-composed instances. `onTokenAcquired` is delegated from the per-key `TokenBucket`'s own hook, but only on the `create()` path — `createWithStrategy()` has no structural hook surface to delegate through for an arbitrary caller-supplied strategy.
- `getCache()` getter exposing the exact composed `LruCache<string, TStrategy>` instance (Layer Transparency Rule).
- `KeyedRateLimiterConfigError`, extending the package-local `KeyedRateLimiterError` base.
