---
title: '@studnicky/keyed-work-gate'
description: Keyed single-flight and serialized work gate composing mutex and coalesce.
---

# @studnicky/keyed-work-gate

> Keyed single-flight and serialized work gate composing `@studnicky/mutex` and `@studnicky/concurrency`'s `Coalesce`.

## Install

```bash
pnpm add @studnicky/keyed-work-gate
```

## Usage

`KeyedWorkGate` performs no work itself — the caller's `fn` is the unit of work being gated. `runSingleFlight` collapses concurrent callers requesting the identical key into one execution via `Coalesce`; `runSerialized` bypasses coalescing entirely and routes directly through `Mutex`, so every call actually runs:

<<< ../../packages/keyed-work-gate/examples/observedKeyedWorkGate.ts#usage

## Composition order: why Coalesce falls through to Mutex

`runSingleFlight` routes through `Coalesce` first, and the `Coalesce` factory itself acquires the `Mutex` before running `fn`. This order is a deliberate, non-obvious sequencing decision — not interchangeable with mutex-first:

1. **Coalesce first** collapses concurrent callers requesting the identical key into a single execution — every caller in the group observes the same result, and `fn` runs exactly once for the whole group.
2. **Mutex fall-through** still guards that one execution against unrelated exclusive work on the same key from a different call path — specifically, a concurrent `runSerialized` call against the same key. Coalescing only dedupes callers *within* `runSingleFlight`; it does nothing to protect the key against other call paths, so the mutex is what keeps the coalesced leader mutually exclusive against that other work.

Reversing the order (mutex-first, then coalesce) would defeat single-flight collapsing: every caller would separately queue for the lock before coalescing ever got a chance to join them, so coalescing would only ever see one queued caller at a time and would never actually collapse concurrent duplicates.

## Transparency contract

`KeyedWorkGate` introduces no hook of its own — every observable stage is already covered by the primitive it delegates to. Each composed primitive accepts either a pre-built instance (subclassed or not) or the config shape passed straight to that primitive's own `create()`:

| Config key | Accepts | Default |
|------------|---------|---------|
| `mutex` | `Mutex<K>` instance or `Partial<MutexConfigEntity.Type>` | `Mutex.create()` |
| `coalesce` | `Coalesce<unknown>` instance or `CoalesceOptionsType` | `Coalesce.create()` |

| Getter | Returns |
|--------|---------|
| `getMutex()` | The composed `Mutex<K>` instance |
| `getCoalesce()` | The composed `Coalesce<unknown>` instance |

Every getter returns the exact instance passed to `create()`/`builder()` — never a copy or wrapper. A caller who subclassed `Mutex` for lock-lifecycle observability or `Coalesce` for join/leader tracking keeps full access to those subclasses' own hooks; `KeyedWorkGate` never re-exposes a stage a wrapped primitive's hook already covers (no redundant "before work" hook, no redundant "after work" hook).

`KeyedWorkGate` does not invent its own staleness ceiling for coalesced calls — that gap stays with `Coalesce` itself, configured via its own `timeout` option.

## When to stop using this and move to Dagonizer

`KeyedWorkGate` gates a single unit of work per key. It has no concept of a node, a graph, or a dependency between multiple keyed calls. Once a workflow needs to coordinate the *outcome* of one keyed call to decide whether or how to run a second one — branching, fan-out across dependent keys, checkpoint/resume, or cross-call retry budgets — that is workflow orchestration and belongs in Dagonizer, not in a loop of `KeyedWorkGate` calls glued together by hand.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/keyed-work-gate

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/keyed-work-gate)
