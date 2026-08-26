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

`@studnicky/keyed-rate-limiter` declares a root usage API and explicit public subpaths.

## Usage

`KeyedRateLimiter#consume(key, tokens?)` / `#waitForToken(key, options?)` lazily create one rate-limiting strategy per key on first use, backed by a composed `LruCache` that bounds and evicts idle keys. Draining one key's strategy has no effect on any other key:

<<< ../../packages/keyed-rate-limiter/examples/observedKeyedRateLimiter.ts#usage

## Try it

<RunnableExample src="packages/keyed-rate-limiter/examples/observedKeyedRateLimiter" title="Per-key token buckets with LRU eviction" />

The output shows `onKeyCreated`/`onTokenAcquired` firing independently for `user-a` and `user-b`, `onLimitExceeded` firing once `user-a`'s bucket is drained, and `onKeyEvicted` firing for `user-a` when a third key (`user-c`) exceeds `maximumKeys` and evicts the LRU tail.

## The `RateLimiterStrategyInterface` extension seam

`KeyedRateLimiter<TStrategy extends RateLimiterStrategyInterface = TokenBucket>` is generic over an injectable rate-limiting strategy — a purely structural seam:

<<< ../../packages/keyed-rate-limiter/src/interfaces/RateLimiterStrategyInterface.ts

`@studnicky/resilience`'s `TokenBucket` matches this shape without declaring or importing it. `KeyedRateLimiter.create(config)` accepts either of two root-exported config families:

- `KeyedRateLimiterCreateConfigInterface` supplies `requestsPerSecond`, `burstSize`, and optional `clock`, `maxKeys`, and `keyIdleTtlMs` for the default `TokenBucket`-per-key path.
- `KeyedRateLimiterStrategyConfigInterface<TStrategy>` supplies `factory`, `maxKeys`, and `keyIdleTtlMs` for any structural strategy implementation.

## Hooks

| Hook | Fires when |
|------|-----------|
| `onKeyCreated(key)` | A key is seen for the first time (or re-seen after eviction) and its strategy is lazily created |
| `onKeyEvicted(key)` | The internal `LruCache` removes a key's strategy through capacity eviction or idle TTL expiry |
| `onLimitExceeded(key)` | `key`'s strategy `consume()` throws, before the error propagates |
| `onTokenAcquired(key, count)` | A successful acquisition on the default token-bucket config path; factory-supplied strategies own their acquisition telemetry |

`KeyedRateLimiter`'s own hooks are specifically about per-key rate-limiting semantics — never a restatement of generic cache/bucket lifecycle.

## Encapsulation contract

`KeyedRateLimiter`'s own hooks (`onKeyCreated`, `onKeyEvicted`, `onLimitExceeded`, `onTokenAcquired`) are specifically about per-key rate-limiting semantics:

The composed cache remains private. Callers observe rate-limiter behavior through `consume()`, `waitForToken()`, and the lifecycle hooks instead of mutating the limiter's owned storage. `onKeyEvicted` is delegated from the internally composed `LruCache`; `onTokenAcquired` is delegated from a per-key `TokenBucket` for the default config family. A factory-supplied strategy owns its own acquisition telemetry because `RateLimiterStrategyInterface` has no hook surface.

## Composition order

`consume()`/`waitForToken()` resolve the key's strategy (cache hit → return it; cache miss → `factory(key)` → `cache.set()` → `onKeyCreated`), then delegate to the strategy's own method. `consume()` wraps the call in a try/catch that fires `onLimitExceeded` and rethrows on failure — it never suppresses the underlying error.

## Errors

| Error | Thrown when |
|-------|-------------|
| `KeyedRateLimiterConfigError` | `KeyedRateLimiter.create(config)` receives an invalid default or strategy configuration |

`consume()`/`waitForToken()` throw whatever the underlying strategy throws on exhaustion — `TokenBucketExhaustedError` (from `@studnicky/resilience`) on the default `create()` path.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/keyed-rate-limiter

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/keyed-rate-limiter)

## Entities

`@studnicky/keyed-rate-limiter/entities` exports every schema namespace in `src/entities`.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import { RateLimitRequestEntity } from '@studnicky/keyed-rate-limiter/entities';
```

## Interfaces

`@studnicky/keyed-rate-limiter/interfaces` exports every TypeScript interface in `src/interfaces`, including configuration and state contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import type { KeyedRateLimiterCreateConfigInterface } from '@studnicky/keyed-rate-limiter/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `KeyedRateLimiter` | Provides keyed rate limiter functionality. | `@studnicky/keyed-rate-limiter` |
| `KeyedRateLimiterConfigError` | Represents keyed rate limiter config failures. | `@studnicky/keyed-rate-limiter` |
| `KeyedRateLimiterError` | Represents keyed rate limiter failures. | `@studnicky/keyed-rate-limiter` |
| `RateLimiterStrategyInterface` | Defines the rate limiter strategy contract. | `@studnicky/keyed-rate-limiter` |
