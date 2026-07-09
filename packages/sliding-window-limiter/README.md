# @studnicky/sliding-window-limiter

> Sliding-window rate limiter — exact timestamp-log or approximate blended-counter algorithm, composable and independently usable.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/sliding-window-limiter)

Rate-limits by counting requests within a rolling time window, rather than a continuously-refilling bucket. `@studnicky/resilience`'s `TokenBucket` is the right primitive when throughput should smooth out over time with burst allowance; `SlidingWindowLimiter` is the right primitive when the requirement is literally "N requests per rolling window" — the single most common rate-limit ask.

Two algorithms, selected via `algorithm`:

- `'log'` — exact. Keeps a bounded queue of admitted request timestamps (capacity = `limit`) and prunes entries older than the window on every `consume()`. No false positives or negatives, at the cost of `O(limit)` memory.
- `'counter'` — approximate, `O(1)` space. Tracks the current and previous fixed window's counts and blends them by the elapsed fraction of the current window, smoothing the boundary discontinuity a naive fixed-window counter would show.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/sliding-window-limiter
```

## Usage

### `'log'` algorithm — exact

```typescript
import { SlidingWindowLimiter, SlidingWindowExhaustedError } from '@studnicky/sliding-window-limiter';

const limiter = SlidingWindowLimiter.create({
  limit: 100,
  windowMs: 60_000, // 100 requests per rolling minute
  algorithm: 'log',
});

try {
  limiter.consume();
  await handleRequest();
} catch (err) {
  if (err instanceof SlidingWindowExhaustedError) {
    // Rate limit exceeded for the current rolling window
  }
}
```

### `'counter'` algorithm — approximate, constant space

```typescript
const limiter = SlidingWindowLimiter.create({
  limit: 1000,
  windowMs: 1000, // ~1000 requests per second, O(1) memory regardless of limit
  algorithm: 'counter',
});

limiter.consume();
```

### Blocking — `waitForToken`

```typescript
const controller = new AbortController();
await limiter.waitForToken({ signal: controller.signal });
await handleRequest();
```

### Builder

```typescript
const limiter = SlidingWindowLimiter.builder()
  .withLimit(100)
  .withWindowMs(60_000)
  .withAlgorithm('log')
  .build();
```

## Structural fit with `@studnicky/keyed-rate-limiter`

`consume(tokens?: number): void` and `waitForToken(options?: { signal?: AbortSignal; tokens?: number }): Promise<void>` are shaped to structurally match the rate-limiter strategy seam `@studnicky/keyed-rate-limiter` expects from any single-instance limiter it wraps per-key (the same method names and parameter shapes `TokenBucket` already exposes). `SlidingWindowLimiter` takes no dependency on `keyed-rate-limiter` and neither package imports the other — the fit is structural typing only, verified by TypeScript's duck typing, not a shared interface import.

`tokens` is accepted on both methods purely for that structural match. Sliding-window rate limiting is one-request-at-a-time by nature (unlike token-bucket's variable per-call cost), so the value passed is otherwise ignored — every `consume()` call, regardless of `tokens`, is treated as exactly one admitted request. This is a deliberate compatibility tradeoff over semantic purity: a narrower `consume(): void` signature would be more honest about the algorithm's semantics, but would not slot into the same generic seam without an adapter.

## API reference

| Export | Type | Description |
|--------|------|-------------|
| `SlidingWindowLimiter` | class | Sliding-window rate limiter (`'log'` or `'counter'`) |
| `SlidingWindowLimiterBuilder` | class | Fluent builder for `SlidingWindowLimiter` |
| `SlidingWindowExhaustedError` | class | Thrown by `consume()` when admission would exceed `limit` |
| `SlidingWindowLimiterConfigError` | class | Thrown by `create()`/`build()` on invalid configuration |
| `SlidingWindowLimiterError` | class | Package-level abstract error ancestor |
| `SlidingWindowLimiterOptionsInterface` | type | `{ limit, windowMs, algorithm: 'log' \| 'counter', clock? }` |

### `SlidingWindowLimiter`

| Member | Signature | Description |
|--------|-----------|-------------|
| `consume` | `(tokens?: number) => void` | Admits one request; throws `SlidingWindowExhaustedError` if it would exceed `limit` |
| `waitForToken` | `(options?: { signal?, tokens? }) => Promise<void>` | Polls until `consume()` would succeed, then consumes |

## Hooks

Subclass `SlidingWindowLimiter` and override protected hooks to add logging, metrics, or tracing without coupling the core to any observability library:

| Hook | When it fires | Args |
|------|--------------|------|
| `onAllow(count)` | After a request is admitted | `count: number` — effective window count post-admission |
| `onReject(count)` | Before throwing, when a request would exceed `limit` | `count: number` — effective window count pre-admission |
| `onWindowRoll()` | When the window boundary advances — `'log'`: stale entries pruned; `'counter'`: fixed-window index changed | — |

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/sliding-window-limiter

## License

MIT
