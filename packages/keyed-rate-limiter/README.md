# @studnicky/keyed-rate-limiter

> Per-key rate limiting composing `@studnicky/cache` and `@studnicky/resilience`

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/keyed-rate-limiter)

Rate-limits operations independently per string key (per user ID, per IP, per API token, ...) by lazily creating one rate-limiting strategy instance per key and evicting idle keys via a composed `@studnicky/cache` `LruCache`. Solves the "hand-rolled `Map<string, TokenBucket>` with no eviction bound" pattern every keyed rate limiter otherwise reinvents.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/keyed-rate-limiter
```

## Usage

```typescript
import { KeyedRateLimiter } from '@studnicky/keyed-rate-limiter';

const limiter = KeyedRateLimiter.create({ requestsPerSecond: 10, burstSize: 20 });

limiter.consume('user-42');            // throws TokenBucketExhaustedError once exhausted
await limiter.waitForToken('user-42'); // blocks until capacity is available
```

Each key gets its own independent `TokenBucket`, lazily created on first use. Draining `user-42`'s bucket has no effect on any other key.

## The `RateLimiterStrategyType` extension seam

`KeyedRateLimiter<TStrategy extends RateLimiterStrategyType = TokenBucket>` is generic over an injectable rate-limiting **strategy** — not hardcoded to `TokenBucket`. The seam is purely structural:

```typescript
export type RateLimiterStrategyType = {
  consume(tokens?: number): void;
  waitForToken(options?: { signal?: AbortSignal; tokens?: number }): Promise<void>;
};
```

`@studnicky/resilience`'s `TokenBucket` already matches this shape without declaring or importing it. Any future rate-limiting algorithm — a sliding-window limiter, a leaky bucket, a fixed-window counter — slots into `KeyedRateLimiter.createWithStrategy()` the same way, by supplying a factory that returns an object with those two methods. No import between the two packages, no second wrapper class, no `instanceof` check anywhere in `KeyedRateLimiter`'s own logic:

```typescript
const limiter = KeyedRateLimiter.createWithStrategy({
  factory: (key) => MySlidingWindowLimiter.create({ windowMs: 1000, limit: 100 })
});
```

`createWithStrategy()`'s `factory` receives the key on every cache miss, so a caller who wants per-key configuration (e.g. a higher limit for a premium tier) branches on `key` inside the factory itself.

## Two construction paths

| Static factory | Strategy | Use when |
|---|---|---|
| `KeyedRateLimiter.create({ requestsPerSecond, burstSize, maxKeys?, keyIdleTtlMs?, clock? })` | `TokenBucket` per key | The default — token-bucket rate limiting, keyed |
| `KeyedRateLimiter.createWithStrategy({ factory, maxKeys?, keyIdleTtlMs? })` | Any `RateLimiterStrategyType`-shaped object | A different algorithm, or per-key strategy configuration |
| `KeyedRateLimiter.builder()` | `TokenBucket` per key | Fluent construction of the `create()` config |

`maxKeys` becomes the composed `LruCache`'s `capacity` (defaults to 10,000 if omitted); `keyIdleTtlMs` becomes its `ttlMs`.

## Transparency contract

`KeyedRateLimiter`'s own hooks are specifically about per-key rate-limiting semantics — never a restatement of generic cache/bucket lifecycle:

| Hook | Fires when |
|------|-----------|
| `onKeyCreated(key)` | A key is seen for the first time (or re-seen after eviction) and its strategy is lazily created |
| `onKeyEvicted(key)` | The internal `LruCache` removes a key's strategy — capacity eviction, idle TTL expiry, or a direct `getCache().delete(key)` all route here |
| `onLimitExceeded(key)` | `key`'s strategy `consume()` throws, before the error propagates |
| `onTokenAcquired(key, count)` | A successful acquisition on the default `create()` path only — see below |

| Getter | Returns |
|--------|---------|
| `getCache()` | The composed `LruCache<string, TStrategy>` instance |

Every getter returns the exact instance used internally — never a copy or wrapper. A consumer who needs `LruCache`'s own `onHit`/`onMiss`/`onStale` subclasses `LruCache` directly and passes a factory into `createWithStrategy()` that reaches it, or works through the getter's returned instance.

### `onTokenAcquired`'s scope

`onTokenAcquired(key, count)` is delegated from the per-key `TokenBucket`'s own `onTokenAcquired` hook — but **only on the `create()` path**. `create()` knows the strategy is `TokenBucket` at construction time, so its factory wraps each per-key bucket in an anonymous subclass whose `onTokenAcquired` calls back into `KeyedRateLimiter#onTokenAcquired(key, count)`.

`createWithStrategy()` cannot make the same guarantee generically: `RateLimiterStrategyType` has no hook surface of its own — it is deliberately minimal (two methods) so any algorithm can satisfy it without adopting substrate's hook conventions. A `createWithStrategy()` consumer who wants acquisition telemetry builds it into their own factory's returned instance, the same way `create()` does internally.

## Composition order

`consume(key, tokens?)` / `waitForToken(key, options?)` both resolve the key's strategy first (cache hit → return it; cache miss → `factory(key)` → `cache.set(key, strategy)` → `onKeyCreated`), then delegate to the strategy's own `consume()`/`waitForToken()`. `onLimitExceeded` wraps `consume()` in a try/catch that fires the hook and rethrows — it never suppresses the underlying error.

## Errors

| Error | Thrown when |
|-------|-------------|
| `KeyedRateLimiterConfigError` | `KeyedRateLimiterBuilder#build()` is called without `requestsPerSecond` or `burstSize` |

`consume()`/`waitForToken()` throw whatever the underlying strategy throws on exhaustion — `TokenBucketExhaustedError` (from `@studnicky/resilience`) on the default `create()` path.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/keyed-rate-limiter

## License

MIT
