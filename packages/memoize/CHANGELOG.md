# Changelog

## 7.0.1

### Patch Changes

- @studnicky/cache@7.0.1
- @studnicky/concurrency@7.0.1
- @studnicky/errors@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/errors@7.0.0
  - @studnicky/concurrency@7.0.0
  - @studnicky/cache@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `Memoize` class composing `@studnicky/cache` (`LruCache`) and `@studnicky/concurrency` (`Coalesce`) into pure function memoization: LRU+TTL result caching keyed by a caller-supplied key derivation function, with in-flight call dedup.
- `call(...args)` public API: returns the cached result for a repeat call whose `keyFn(...args)` matches a live cache entry without re-invoking the wrapped function; otherwise runs the wrapped function through the composed `Coalesce` so concurrent callers sharing the same derived key share one invocation, then caches the result.
- Protected lifecycle hooks (`onMemoHit`, `onMemoMiss`, `onMemoCoalesced`) — `onMemoMiss`/`onMemoCoalesced` delegated from the internal `Coalesce` instance's `onCoalesceStart`/`onCoalesceJoin`, following the delegation technique `@studnicky/idempotency-guard`'s `IdempotencyGuard` uses for its own `onExecute`/`onCoalesce`.
- `invalidate(...args)` evicts the cache entry for the derived key so the next matching call re-invokes the wrapped function; `clear()` evicts every cached entry.
- `getCache()`/`getCoalesce()` getters exposing the exact composed instances (Layer Transparency Rule).
- `MemoizeConfigError`, extending the package-local `MemoizeError` base.
