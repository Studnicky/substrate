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

`BoundaryKit` composes calls in the fixed order `throttle → circuitBreaker → retry → fn`. Default construction resolves every composed primitive, including `CircuitBreaker` (which has no zero-arg default of its own), and pre-built subclassed primitives pass straight through with their own hooks intact:

<<< ../../packages/boundary-kit/examples/observedBoundaryKit.ts#usage

## Transparency contract

`BoundaryKit` introduces no hook of its own — every observable stage is already covered by the primitive it delegates to. Each composed primitive accepts either a pre-built instance (subclassed or not) or the config shape passed straight to that primitive's own `create()`:

| Config key | Accepts | Default |
|------------|---------|---------|
| `throttle` | `Throttle` instance or `Partial<ThrottleConfigEntity.Type>` | `Throttle.create()` |
| `circuitBreaker` | `CircuitBreaker` instance or `CircuitBreakerOptionsInterface` | `{ failureThreshold: 5, resetTimeoutMs: 30_000 }` |
| `retry` | `Retry` instance or `Partial<RetryConfigInterface>` | `Retry.create()` |

| Getter | Returns |
|--------|---------|
| `getThrottle()` | The composed `Throttle` instance |
| `getCircuitBreaker()` | The composed `CircuitBreaker` instance |
| `getRetry()` | The composed `Retry` instance |

Every getter returns the exact instance passed to `create()`/`builder()` — never a copy or wrapper. A caller who subclassed `Throttle` for adaptive concurrency, `CircuitBreaker` for custom error classification, or `Retry` for custom backoff keeps full access to those subclasses' own hooks; `BoundaryKit` never re-exposes a stage a wrapped primitive's hook already covers (no redundant "before call" hook, no redundant "on failure" hook).

## Composition order

Throttle bounds concurrency first, so the circuit breaker and retry never observe more concurrent load than the throttle admits. The circuit breaker wraps retry, so a tripped circuit fails fast BEFORE any retry attempt runs — reversing this order would let every retry attempt re-enter and re-trip the breaker individually, wasting attempts against a dependency already known to be broken. Retry is innermost, operating directly against the real call. This is the kit's entire value-add: the order is non-obvious and easy to get backwards by hand, and getting it wrong changes behavior silently.

## Aborted throttle calls

`Throttle#execute()` resolves `undefined` (rather than rejecting) when the throttle discards a call via its detach-and-abandon abort behavior. Since `BoundaryKit#execute()` cannot return `undefined` as `T`, it surfaces that discard as a rejected `BoundaryKitAbortedError` instead of silently returning `undefined`.

## When to stop using this and move to Dagonizer

`BoundaryKit` protects exactly one call (with its own internal throttle/circuit/retry state). It has no concept of a node, a graph, or a dependency between multiple calls. Once a workflow needs to coordinate the *outcome* of one `BoundaryKit#execute()` call to decide whether or how to run a second one — branching, fan-out across dependent calls, checkpoint/resume, or cross-call retry budgets — that is workflow orchestration and belongs in Dagonizer, not in a loop of `BoundaryKit` calls glued together by hand.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/boundary-kit

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/boundary-kit)
