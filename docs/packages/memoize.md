---
title: '@studnicky/memoize'
description: Pure function memoization composing cache and concurrency — LRU+TTL result caching with in-flight call dedup.
---

# @studnicky/memoize

> Pure function memoization composing `@studnicky/cache` and `@studnicky/concurrency`.

**vs. `@studnicky/idempotency-guard`:** both compose `LruCache` + `Coalesce`, but solve different problems. `Memoize` is pure memoization — the same derived key always replays the cached result, no conflict detection. `IdempotencyGuard` fingerprints a payload alongside the cached result and *errors* when a key is reused for a different payload. Pick `IdempotencyGuard` when key reuse with a different payload is a bug to catch; pick `Memoize` when the goal is simply caching a function's result.

## Install

```bash
pnpm add @studnicky/memoize
```

## Usage

`Memoize#call(...args)` derives `key = keyFn(...args)` and checks the composed `LruCache` for an entry under `key`. A hit returns the cached result without re-invoking the wrapped function; a miss runs the call through the composed `Coalesce` so concurrent callers sharing the derived key share one invocation:

<<< ../../packages/memoize/examples/observedMemoize.ts#usage

## Hooks

| Hook | Fires when |
|------|------------|
| `onMemoHit(key, args)` | `call()` returns a cached result for `key` without re-invoking `fn` |
| `onMemoMiss(key, args)` | `key` is genuinely new (or its entry expired) and `fn` is about to run |
| `onMemoCoalesced(key, args)` | A caller joins an already in-flight invocation for `key` |

`Memoize` introduces no hooks duplicating what `LruCache`/`Coalesce` already expose — its own hooks are specifically about memoization semantics (hit/miss/coalesced). Generic cache/coalesce lifecycle (`onEvict`, `onExpire`, `onCoalesceSettled`, `onTimeout`, ...) stays reachable via `getCache()`/`getCoalesce()` for a consumer who subclasses the composed instances directly.

## Transparency contract

`Memoize`'s own hooks (`onMemoHit`, `onMemoMiss`, `onMemoCoalesced`) are specifically about memoization semantics — never a restatement of generic cache/coalesce lifecycle:

| Getter | Returns |
|--------|---------|
| `getCache()` | The composed `LruCache<string, TResult>` instance |
| `getCoalesce()` | The composed `Coalesce<TResult>` instance |

Every getter returns the exact instance used internally — never a copy or wrapper. A consumer who needs `LruCache`'s `onEvict`/`onExpire`/`onHit` or `Coalesce`'s `onCoalesceSettled`/`onTimeout` subclasses those primitives directly and passes nothing new through `Memoize` — `Memoize` composes `LruCache`/`Coalesce` internally rather than accepting them as injected config, so those getters are the only path to the live instances.

## Composition order

`call()` derives `key` from `args` → checks the cache (`onMemoHit` short-circuits here) → on a miss, delegates to the composed `Coalesce` (`onMemoMiss` for the leader about to invoke the wrapped function, `onMemoCoalesced` for followers joining the in-flight call) → stores the result in the cache on success.

## Errors

| Error | Thrown when |
|-------|-------------|
| `MemoizeConfigError` | `MemoizeBuilder#build()` is called without `fn`, `keyFn`, or `capacity` |

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/memoize

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/memoize)
