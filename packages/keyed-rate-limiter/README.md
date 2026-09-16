# @studnicky/keyed-rate-limiter

> Per-key rate limiting composing `@studnicky/cache` and `@studnicky/resilience`

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/keyed-rate-limiter)

Rate-limit operations independently by string key, such as a user ID, IP address, or API token. Configure the default token-bucket strategy or supply a compatible strategy factory.

Import schema declarations from `@studnicky/keyed-rate-limiter/entities` when validating request and limiter configuration.

Use `@studnicky/keyed-rate-limiter/node` in Node or `@studnicky/keyed-rate-limiter/browser` in browsers. Import schema-backed data declarations from `@studnicky/keyed-rate-limiter/entities` and type-only contracts from `@studnicky/keyed-rate-limiter/interfaces`. The Node and browser runtime entrypoints expose the same API.

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
import { KeyedRateLimiter } from '@studnicky/keyed-rate-limiter/node';

const limiter = KeyedRateLimiter.create({ requestsPerSecond: 10, burstSize: 20 });

const result = limiter.consume('user-42');
await limiter.waitForToken('user-42');

console.log(result.consumedTokens, result.remainingTokens);
```

Each key gets its own independent `TokenBucket`, lazily created on first use. Draining `user-42`'s bucket has no effect on any other key.

Every successful `consume()` and `waitForToken()` returns `RateLimitConsumptionEntity.Type` from `@studnicky/resilience/entities`: `consumedTokens` reports the requested consumption count and `remainingTokens` reports the strategy capacity left after that acquisition. Both operations require a non-empty string key and positive finite tokens when supplied; factory strategies provide callable `consume()` and `waitForToken()` methods and return the same canonical consumption entity.

## The `RateLimiterStrategyInterface` extension seam

`KeyedRateLimiter<TStrategy extends RateLimiterStrategyInterface = TokenBucket>` is generic over an injectable rate-limiting **strategy** — not hardcoded to `TokenBucket`. The seam is purely structural:

```typescript
import type { RateLimitConsumptionEntity } from '@studnicky/resilience/entities';

export interface RateLimiterStrategyInterface {
  consume(tokens?: number): RateLimitConsumptionEntity.Type;
  waitForToken(options?: { signal?: AbortSignal; tokens?: number }): Promise<RateLimitConsumptionEntity.Type>;
}
```

`@studnicky/resilience`'s `TokenBucket` already matches this shape without declaring or importing it. Any rate-limiting algorithm that returns `RateLimitConsumptionEntity.Type` slots into `KeyedRateLimiter.create()` through a factory:

```typescript
import { KeyedRateLimiter } from '@studnicky/keyed-rate-limiter/node';
import { SlidingWindowLimiter } from '@studnicky/resilience/node';

const limiter = KeyedRateLimiter.create({
  factory: () => SlidingWindowLimiter.create({
    algorithm: 'log',
    limit: 100,
    windowMs: 1_000,
  }),
});

limiter.consume('user-42');
```

The factory-based `create()` configuration receives the key on every cache miss, so a caller who wants per-key configuration (e.g. a higher limit for a premium tier) branches on `key` inside the factory itself.

## Two construction paths

| Static factory | Strategy | Use when |
|---|---|---|
| `KeyedRateLimiter.create({ requestsPerSecond, burstSize, maximumKeys?, keyIdleTtlMs?, clock? })` | `TokenBucket` per key | The default — token-bucket rate limiting, keyed |
| `KeyedRateLimiter.create({ factory, maximumKeys?, keyIdleTtlMs? })` | Any `RateLimiterStrategyInterface` implementation | A different algorithm, or per-key strategy configuration |

`maximumKeys` becomes the composed `LruCache`'s `capacity` (defaults to 10,000 if omitted); `keyIdleTtlMs` becomes its `ttlMs`.

## Lifecycle hooks

`KeyedRateLimiter`'s own hooks are specifically about per-key rate-limiting semantics — never a restatement of generic cache/bucket lifecycle:

| Hook | Fires when |
|------|-----------|
| `onKeyCreated(key)` | A key is seen for the first time (or re-seen after eviction) and its strategy is lazily created |
| `onKeyEvicted(key)` | The internal `LruCache` removes a key's strategy through capacity eviction or idle TTL expiry |
| `onLimitExceeded(key)` | `key`'s strategy `consume()` throws, before the error propagates |
| `onTokenAcquired(key, result)` | Every successful `consume()` or `waitForToken()` acquisition, including factory strategies |

The composed cache remains private. Callers observe rate-limiter behavior through `consume()`, `waitForToken()`, and the lifecycle hooks instead of mutating the limiter's owned storage.

### `onTokenAcquired` results

`onTokenAcquired(key, result)` receives the same canonical consumption result returned to the caller. It fires after a successful `consume()` or `waitForToken()` call for both default token buckets and factory strategies.

## Composition order

`consume(key, tokens?)` / `waitForToken(key, options?)` both resolve the key's strategy first (cache hit → return it; cache miss → `factory(key)` → `cache.set(key, strategy)` → `onKeyCreated`), then delegate to the strategy's own `consume()`/`waitForToken()`. `onLimitExceeded` wraps `consume()` in a try/catch that fires the hook and rethrows — it never suppresses the underlying error.

`consume()`/`waitForToken()` throw whatever the underlying strategy throws on exhaustion — `TokenBucketExhaustedError` (from `@studnicky/resilience`) on the default `create()` path.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/keyed-rate-limiter

## License

MIT
