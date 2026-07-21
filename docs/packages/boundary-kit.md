---
title: '@studnicky/boundary-kit'
description: Composes throttle, circuit breaker, and retry into a fixed-order boundary call pattern.
---

# @studnicky/boundary-kit

> Composes `@studnicky/throttle`, `@studnicky/resilience`'s `CircuitBreaker`, and `@studnicky/retry` into a fixed-order boundary call pattern.

## Install

```bash
pnpm add @studnicky/boundary-kit
```

## Usage

`BoundaryKit` composes calls in the fixed order `throttle → circuitBreaker → retry → fn`.
Import `BoundaryKit` from `@studnicky/boundary-kit`, call
`BoundaryKit.create({ circuitBreaker, retry, throttle })`, then pass the operation to
`boundary.execute(fn)`. Omitted configuration fields resolve to package defaults.

## Transparency contract

`BoundaryKit` introduces no hook of its own — every observable stage is already covered by the primitive it delegates to. Each composed primitive accepts either a pre-built instance (subclassed or not) or the config shape passed straight to that primitive's own `create()`:

| Config key | Accepts | Default |
|------------|---------|---------|
| `throttle` | `Throttle` instance or `ThrottleConfigEntity.Type` | `Throttle.create()` |
| `circuitBreaker` | `CircuitBreaker` instance or `CircuitBreakerOptionsInterface` | `{ failureThreshold: 5, resetTimeoutMs: 30_000 }` |
| `retry` | `Retry` instance or `RetryConfigInterface` | `Retry.create()` |

A caller can pass pre-built subclass instances and retain those references for direct access to their hooks and state. `BoundaryKit` adds no redundant "before call" or "on failure" hook because the composed primitives already own those lifecycle stages.

## Composition order

Throttle bounds concurrency first, so the circuit breaker and retry never observe more concurrent load than the throttle admits. The circuit breaker wraps retry, so a tripped circuit fails fast BEFORE any retry attempt runs — reversing this order would let every retry attempt re-enter and re-trip the breaker individually, wasting attempts against a dependency already known to be broken. Retry is innermost, operating directly against the real call. This is the kit's entire value-add: the order is non-obvious and easy to get backwards by hand, and getting it wrong changes behavior silently.

## Aborted throttle calls

`BoundaryKit#execute()` tracks whether the inner operation completes separately from its resolved value. An operation that legitimately resolves `undefined` or returns `void` completes normally with that value. `BoundaryKitAbortedError` is reserved for a throttle discard caused by detach-and-abandon abort behavior, where the inner operation never runs.

## When to stop using this and move to Dagonizer

`BoundaryKit` protects exactly one call (with its own internal throttle/circuit/retry state). It has no concept of a node, a graph, or a dependency between multiple calls. Once a workflow needs to coordinate the *outcome* of one `BoundaryKit#execute()` call to decide whether or how to run a second one — branching, fan-out across dependent calls, checkpoint/resume, or cross-call retry budgets — that is workflow orchestration and belongs in Dagonizer, not in a loop of `BoundaryKit` calls glued together by hand.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/boundary-kit

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/boundary-kit)
