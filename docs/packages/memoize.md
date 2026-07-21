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

`@studnicky/memoize` is the sole public code entrypoint.

## Usage

`Memoize#call(...args)` derives `key = keyFn(...args)` and checks the composed `LruCache` for an entry under `key`. A hit returns the cached result without re-invoking the wrapped function; a miss runs the call through the composed `Coalesce` so concurrent callers sharing the derived key share one invocation:

<<< ../../packages/memoize/examples/observedMemoize.ts#usage

## Hooks

| Hook | Fires when |
|------|------------|
| `onMemoHit(key, args)` | `call()` returns a cached result for `key` without re-invoking `fn` |
| `onMemoMiss(key, args)` | `key` is genuinely new (or its entry expired) and `fn` is about to run |
| `onMemoCoalesced(key, args)` | A caller joins an already in-flight invocation for `key` |

`Memoize`'s hooks are specifically about memoization semantics (hit/miss/coalesced); implementation-level cache and coalescing state stays encapsulated.

## Encapsulation contract

`Memoize`'s own hooks (`onMemoHit`, `onMemoMiss`, `onMemoCoalesced`) are specifically about memoization semantics — never a restatement of generic cache/coalesce lifecycle:

The composed `LruCache` and `Coalesce` remain private. Callers control cached state through `invalidate()` and `clear()`, and observe memoization behavior through the memo-specific hooks.

## Composition order

`call()` derives `key` from `args` → checks the cache (`onMemoHit` short-circuits here) → on a miss, delegates to the composed `Coalesce` (`onMemoMiss` for the leader about to invoke the wrapped function, `onMemoCoalesced` for followers joining the in-flight call) → stores the result in the cache on success.

## Errors

| Error | Thrown when |
|-------|-------------|
| `MemoizeConfigError` | `Memoize.create(fn, options)` receives an invalid function, key derivation, or cache capacity |

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/memoize

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/memoize)
