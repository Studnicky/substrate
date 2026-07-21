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

`IdempotencyGuard<TResult>#run(key, payload, factory)` fingerprints `payload` via `Hash.value()` and checks the composed `LruCache` for an entry under `key`. `TResult` belongs to the guard instance and is shared by every key it owns. A matching fingerprint replays the cached result; a mismatched fingerprint throws `IdempotencyConflictError` before `factory` runs; no entry runs the call through the composed `Coalesce` so concurrent callers sharing the key share one execution:

<<< ../../packages/idempotency-guard/examples/observedIdempotencyGuard.ts#usage

## Hooks

| Hook | Fires when |
|------|------------|
| `onReplay(key)` | A repeat call for `key` finds a matching-fingerprint cached entry and replays it |
| `onCoalesce(key)` | A caller joins an already in-flight execution for `key` |
| `onConflict(key)` | Fires immediately before throwing `IdempotencyConflictError` for a fingerprint mismatch |
| `onExecute(key)` | `key` is genuinely new (or its entry expired) and `factory` is about to run |

`IdempotencyGuard` introduces no hooks duplicating generic cache or coalescing lifecycle. Its hooks are specifically about idempotency semantics: replay, conflict, execution, and joining an in-flight call.

## Ownership contract

`IdempotencyGuard.create({ capacity, ttlMs })` creates and owns its cache and coalescer. Those collaborators are implementation details and have no public getters. Consumers observe the guard through `onReplay`, `onCoalesce`, `onConflict`, and `onExecute`.

Import `IdempotencyGuard`, `IdempotencyGuardOptionsEntity`, `IdempotencyGuardEntryMetadataEntity`, `IdempotencyGuardEntryInterface`, `IdempotencyConflictError`, and `IdempotencyGuardError` from `@studnicky/idempotency-guard`. `IdempotencyGuardEntryInterface<TResult>` composes the schema-derived fingerprint from the metadata entity and retains the caller-owned generic result. The package root is the only public code entrypoint.

## Composition order

`run()` computes the payload fingerprint → checks the cache (`onReplay` / `onConflict` paths short-circuit here) → on a miss, delegates to the composed `Coalesce` (`onExecute` for the leader about to invoke `factory`, `onCoalesce` for followers joining the in-flight call) → stores `{ fingerprint, result }` in the cache on success.

## Errors

| Error | Thrown when |
|-------|-------------|
| `IdempotencyConflictError` | `run()` is called with a key whose cached entry has a different payload fingerprint |
| `IdempotencyGuardError` | Base domain error for idempotency-guard failures |

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/idempotency-guard

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/idempotency-guard)
