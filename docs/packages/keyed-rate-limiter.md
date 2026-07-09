---
title: '@studnicky/keyed-rate-limiter'
description: Per-key rate limiting composing cache and resilience — one strategy instance per key, evicted via LRU+TTL.
---

# @studnicky/keyed-rate-limiter

> Per-key rate limiting composing `@studnicky/cache` and `@studnicky/resilience`.

## Install

```bash
pnpm add @studnicky/keyed-rate-limiter
```

## Usage

`KeyedRateLimiter#consume(key, tokens?)` / `#waitForToken(key, options?)` lazily create one rate-limiting strategy per key on first use, backed by a composed `LruCache` that bounds and evicts idle keys. Draining one key's strategy has no effect on any other key:

<<< ../../packages/keyed-rate-limiter/examples/observedKeyedRateLimiter.ts#usage

## The `RateLimiterStrategyType` extension seam

`KeyedRateLimiter<TStrategy extends RateLimiterStrategyType = TokenBucket>` is generic over an injectable rate-limiting strategy — a purely structural seam:

<<< ../../packages/keyed-rate-limiter/src/RateLimiterStrategyType.ts#shape

`@studnicky/resilience`'s `TokenBucket` matches this shape without declaring or importing it. `KeyedRateLimiter.create()` composes a `TokenBucket` per key by default; `KeyedRateLimiter.createWithStrategy()` accepts any factory producing an object with those two methods — a future rate-limiting algorithm slots in without a second wrapper class, and without ever importing from `@studnicky/keyed-rate-limiter` or coupling to `TokenBucket`.

## Hooks

| Hook | Fires when |
|------|-----------|
| `onKeyCreated(key)` | A key is seen for the first time (or re-seen after eviction) and its strategy is lazily created |
| `onKeyEvicted(key)` | The internal `LruCache` removes a key's strategy — capacity eviction, idle TTL expiry, or a direct `getCache().delete(key)` all route here |
| `onLimitExceeded(key)` | `key`'s strategy `consume()` throws, before the error propagates |
| `onTokenAcquired(key, count)` | A successful acquisition on the default `create()` path only — delegated from the per-key `TokenBucket`'s own hook; `createWithStrategy()` has no hook surface to delegate through for an arbitrary caller-supplied strategy |

`KeyedRateLimiter`'s own hooks are specifically about per-key rate-limiting semantics — never a restatement of generic cache/bucket lifecycle.

## Transparency contract

`KeyedRateLimiter`'s own hooks (`onKeyCreated`, `onKeyEvicted`, `onLimitExceeded`, `onTokenAcquired`) are specifically about per-key rate-limiting semantics:

| Getter | Returns |
|--------|---------|
| `getCache()` | The composed `LruCache<string, TStrategy>` instance |

Every getter returns the exact instance used internally — never a copy or wrapper. `onKeyEvicted` is delegated from the internally-composed `LruCache`'s own `onEvict`/`onExpire`/`onDelete` hooks (capacity eviction, idle TTL expiry, and direct deletion respectively), the same delegation technique `@studnicky/paginator`'s `Paginator` and `@studnicky/idempotency-guard`'s `IdempotencyGuard` use for their own internally-composed instances. `onTokenAcquired` is delegated from the per-key `TokenBucket`'s own hook, but only on the `create()` path — `createWithStrategy()` has no structural hook surface to delegate through for an arbitrary caller-supplied strategy.

## Composition order

`consume()`/`waitForToken()` resolve the key's strategy (cache hit → return it; cache miss → `factory(key)` → `cache.set()` → `onKeyCreated`), then delegate to the strategy's own method. `consume()` wraps the call in a try/catch that fires `onLimitExceeded` and rethrows on failure — it never suppresses the underlying error.

## Errors

| Error | Thrown when |
|-------|-------------|
| `KeyedRateLimiterConfigError` | `KeyedRateLimiterBuilder#build()` is called without `requestsPerSecond` or `burstSize` |

`consume()`/`waitForToken()` throw whatever the underlying strategy throws on exhaustion — `TokenBucketExhaustedError` (from `@studnicky/resilience`) on the default `create()` path.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/keyed-rate-limiter

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/keyed-rate-limiter)
