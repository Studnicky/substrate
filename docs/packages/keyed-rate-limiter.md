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

`@studnicky/keyed-rate-limiter/node` and `@studnicky/keyed-rate-limiter/browser` provide the same runtime API. Import schema declarations from `@studnicky/keyed-rate-limiter/entities` and contracts from `@studnicky/keyed-rate-limiter/interfaces`.

## Usage

`KeyedRateLimiter#consume(key, tokens?)` / `#waitForToken(key, options?)` lazily create one rate-limiting strategy per key on first use, backed by a composed `LruCache` that bounds and evicts idle keys. Draining one key's strategy has no effect on any other key:

<<< ../../packages/keyed-rate-limiter/examples/observedKeyedRateLimiter.ts#usage

Every successful acquisition returns `RateLimitConsumptionEntity.Type` from `@studnicky/resilience/entities`. `consumedTokens` is the amount acquired and `remainingTokens` is the capacity left for that key.

## Try it

<RunnableExample src="packages/keyed-rate-limiter/examples/observedKeyedRateLimiter" title="Per-key token buckets with LRU eviction" />

The output shows `onKeyCreated` and `onTokenAcquired` results for independent keys, `onLimitExceeded` once `user-a` is drained, and `onKeyEvicted` when `maximumKeys` evicts the least recently used key.

## The `RateLimiterStrategyInterface` extension seam

`KeyedRateLimiter<TStrategy extends RateLimiterStrategyInterface = TokenBucket>` is generic over an injectable rate-limiting strategy — a purely structural seam:

<<< ../../packages/keyed-rate-limiter/src/interfaces/RateLimiterStrategyInterface.ts

Both the default token bucket and factory strategies return `RateLimitConsumptionEntity.Type` from `@studnicky/resilience/entities`. `KeyedRateLimiter.create(config)` accepts either of two runtime-exported config families:

- `KeyedRateLimiterCreateConfigInterface` supplies `requestsPerSecond`, `burstSize`, and optional `clock`, `maximumKeys`, and `keyIdleTtlMs` for the default `TokenBucket`-per-key path.
- `KeyedRateLimiterStrategyConfigInterface<TStrategy>` supplies `factory`, `maximumKeys`, and `keyIdleTtlMs` for any structural strategy implementation.

## Hooks

| Hook | Fires when |
|------|-----------|
| `onKeyCreated(key)` | A key is seen for the first time (or re-seen after eviction) and its strategy is lazily created |
| `onKeyEvicted(key)` | The internal `LruCache` removes a key's strategy through capacity eviction or idle TTL expiry |
| `onLimitExceeded(key)` | `key`'s strategy `consume()` throws, before the error propagates |
| `onTokenAcquired(key, result)` | Every successful `consume()` or `waitForToken()` acquisition, including factory strategies |

`KeyedRateLimiter`'s own hooks are specifically about per-key rate-limiting semantics — never a restatement of generic cache/bucket lifecycle.

## Using a strategy

Call `consume(key, tokens?)` for immediate admission or `waitForToken(key, options?)` to wait for capacity. The default strategy throws `TokenBucketExhaustedError` when capacity is unavailable; a supplied strategy keeps its own documented error behavior.

## Errors

| Error | Thrown when |
|-------|-------------|
| `KeyedRateLimiterConfigError` | `KeyedRateLimiter.create(config)` receives an invalid default or strategy configuration |
| `KeyedRateLimiterBoundaryError` | An operation request, factory strategy, or strategy result violates the public contract |

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
| `KeyedRateLimiter` | Provides keyed rate limiter functionality. | `@studnicky/keyed-rate-limiter/node` |
| `KeyedRateLimiterBoundaryError` | Represents invalid operation, strategy, and strategy-result boundaries. | `@studnicky/keyed-rate-limiter/node` |
| `KeyedRateLimiterConfigError` | Represents keyed rate limiter config failures. | `@studnicky/keyed-rate-limiter/node` |
| `KeyedRateLimiterError` | Represents keyed rate limiter failures. | `@studnicky/keyed-rate-limiter/node` |
| `RateLimiterStrategyInterface` | Defines the rate limiter strategy contract. | `@studnicky/keyed-rate-limiter/interfaces` |
