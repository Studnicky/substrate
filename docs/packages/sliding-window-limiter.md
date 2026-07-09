---
title: '@studnicky/sliding-window-limiter'
description: Sliding-window rate limiter — exact timestamp-log or approximate blended-counter algorithm.
---

# @studnicky/sliding-window-limiter

> Sliding-window rate limiter — exact timestamp-log or approximate blended-counter algorithm. Independently usable and composable.

## Install

```bash
pnpm add @studnicky/sliding-window-limiter
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

Rate-limits by counting requests within a rolling time window rather than a continuously-refilling bucket — the single most common rate-limit ask. Two algorithms, selected via `algorithm`:

- `'log'` — exact. A bounded queue of admitted request timestamps (capacity = `limit`) is pruned of stale entries on every `consume()`. No false positives or negatives, `O(limit)` memory.
- `'counter'` — approximate, `O(1)` space. Blends the current and previous fixed window's counts by the elapsed fraction of the current window, smoothing the boundary discontinuity a naive fixed-window counter would show.

<<< ../../packages/sliding-window-limiter/examples/observedSlidingWindowLimiter.ts#usage

## Structural fit with `@studnicky/keyed-rate-limiter`

`consume(tokens?: number): void` and `waitForToken(options?: { signal?: AbortSignal; tokens?: number }): Promise<void>` structurally match the rate-limiter strategy seam `@studnicky/keyed-rate-limiter` expects from a single-instance limiter it wraps per-key — the same method names and parameter shapes `TokenBucket` already exposes. Neither package imports the other; the fit is TypeScript structural typing only.

`tokens` is accepted on both methods purely for that structural match. Sliding-window rate limiting is one-request-at-a-time by nature, so the value passed is otherwise ignored — every `consume()` call is treated as exactly one admitted request regardless of `tokens`.

## Try it

The demo subclasses `SlidingWindowLimiter` and overrides `onAllow`, `onReject`, and `onWindowRoll`. It walks both algorithms through admission up to the limit, a rejection at the limit, and admission again once the window (or its blended estimate) clears — then demonstrates `waitForToken` polling until capacity frees up.

<RunnableExample src="packages/sliding-window-limiter/examples/observedSlidingWindowLimiter" title="SlidingWindowLimiter — both algorithms and lifecycle hooks" />

## Observability hooks

Subclass `SlidingWindowLimiter` and override protected hooks to add logging, metrics, or tracing without coupling the core to any observability library.

| Hook | When it fires | Args |
|------|--------------|------|
| `onAllow(count)` | After a request is admitted | `count: number` — effective window count post-admission |
| `onReject(count)` | Before throwing, when a request would exceed `limit` | `count: number` — effective window count pre-admission |
| `onWindowRoll()` | When the window boundary advances — `'log'`: stale entries pruned; `'counter'`: fixed-window index changed | — |

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## API

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

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/sliding-window-limiter)
