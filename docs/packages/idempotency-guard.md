---
title: '@studnicky/idempotency-guard'
description: Idempotency key guard composing cache, concurrency, and json — replay, coalesce, and conflict detection.
---

# @studnicky/idempotency-guard

> Idempotency key guard composing `@studnicky/cache`, `@studnicky/concurrency`, and `@studnicky/json`.

## Install

```bash
pnpm add @studnicky/idempotency-guard
```

## Usage

`IdempotencyGuard#run(key, payload, factory)` fingerprints `payload` via `Hash.value()` and checks the composed `LruCache` for an entry under `key`. A matching fingerprint replays the cached result; a mismatched fingerprint throws `IdempotencyConflictError` before `factory` runs; no entry runs the call through the composed `Coalesce` so concurrent callers sharing the key share one execution:

<<< ../../packages/idempotency-guard/examples/observedIdempotencyGuard.ts#usage

## Hooks

| Hook | Fires when |
|------|------------|
| `onReplay(key)` | A repeat call for `key` finds a matching-fingerprint cached entry and replays it |
| `onCoalesce(key)` | A caller joins an already in-flight execution for `key` |
| `onConflict(key)` | Fires immediately before throwing `IdempotencyConflictError` for a fingerprint mismatch |
| `onExecute(key)` | `key` is genuinely new (or its entry expired) and `factory` is about to run |

`IdempotencyGuard` introduces no hooks duplicating what `LruCache`/`Coalesce` already expose — its own hooks are specifically about idempotency semantics (replay/conflict/execute/coalesce). Generic cache/coalesce lifecycle (`onHit`, `onEvict`, `onCoalesceSettled`, `onTimeout`, ...) stays reachable via `getCache()`/`getCoalesce()` for a consumer who subclasses the composed instances directly.

## Transparency contract

`IdempotencyGuard`'s own hooks (`onReplay`, `onCoalesce`, `onConflict`, `onExecute`) are specifically about idempotency semantics — never a restatement of generic cache/coalesce lifecycle:

| Getter | Returns |
|--------|---------|
| `getCache()` | The composed `LruCache<string, { fingerprint, result }>` instance |
| `getCoalesce()` | The composed `Coalesce<unknown>` instance |

Every getter returns the exact instance used internally — never a copy or wrapper. A consumer who needs `LruCache`'s `onEvict`/`onExpire`/`onHit` or `Coalesce`'s `onCoalesceSettled`/`onTimeout` subclasses those primitives directly and passes nothing new through `IdempotencyGuard` — `IdempotencyGuard` composes `LruCache`/`Coalesce` internally rather than accepting them as injected config, so those getters are the only path to the live instances.

## Composition order

`run()` computes the payload fingerprint → checks the cache (`onReplay` / `onConflict` paths short-circuit here) → on a miss, delegates to the composed `Coalesce` (`onExecute` for the leader about to invoke `factory`, `onCoalesce` for followers joining the in-flight call) → stores `{ fingerprint, result }` in the cache on success.

## Errors

| Error | Thrown when |
|-------|-------------|
| `IdempotencyConflictError` | `run()` is called with a key whose cached entry has a different payload fingerprint |
| `IdempotencyGuardConfigError` | `IdempotencyGuardBuilder#build()` is called without `capacity` or `ttlMs` |

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/idempotency-guard

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/idempotency-guard)
