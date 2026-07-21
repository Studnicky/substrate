---
title: '@studnicky/request-executor'
description: One-shot request execution pattern composing fetch, retry, signal, timing, and context.
---

# @studnicky/request-executor

> One-shot request execution pattern composing `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, `@studnicky/timing`, and `@studnicky/context`.

## Install

```bash
pnpm add @studnicky/request-executor
```

## Usage

`RequestExecutor` does not perform HTTP calls itself — the caller's `fn` receives the composed `FetchClient` and a composed `AbortSignal` (merged from a caller-supplied `AbortSignal` and/or `deadlineMs` via `Signal#compose()`) and decides which verb to call. The call runs through the composed `Retry` loop; an optional `Timing` instance brackets the whole loop with a single span; an optional `Context` runs the whole call inside a fresh scope:

<<< ../../packages/request-executor/examples/observedRequestExecutor.ts#usage

## Transparency contract

`RequestExecutor` introduces no hook of its own — every observable stage is already covered by the primitive it delegates to. Each composed primitive accepts either a pre-built instance (subclassed or not) or the config shape passed straight to that primitive's own `create()`:

| Config key | Accepts | Default |
|------------|---------|---------|
| `fetchClient` | `FetchClient` instance or `ClientConfigInterface` from `@studnicky/fetch` | `FetchClient.create({})` |
| `retry` | `Retry` instance or `RetryConfigInterface` from `@studnicky/retry` | `Retry.create({})` |
| `signal` | `Signal` instance | `Signal.create()` |
| `timing` | `Timing` instance | `undefined` — no span recorded |
| `context` | `Context` instance | `undefined` — no scope wrapping |
| `deadlineMs` | Default deadline (ms) for calls that don't pass their own | `undefined` |

`RequestExecutor` exposes no collaborator getters. Callers retain references to any `FetchClient`, `Retry`, `Signal`, `Timing`, or `Context` instances supplied to `RequestExecutor.create(config)` when they need those primitives' hooks or state. The executor never re-exposes a stage a wrapped primitive already owns.

Import `RequestExecutor`, `RequestExecutorConfigInterface`, `RequestExecutorDepsInterface`, and `RequestExecutorExecuteOptionsInterface` from `@studnicky/request-executor`. The package root is the only public code entrypoint. Import dependency-owned configuration and context contracts directly from their owning package roots.

## Composition order

`context` scope wraps the whole call → `timing` span brackets the retry loop → `retry` loop wraps the caller's `fn` → the composed cancellation `AbortSignal` threads into whatever call `fn` makes.

## When to stop using this and move to Dagonizer

`RequestExecutor` executes exactly one call (with its own internal retry attempts). It has no concept of a node, a graph, or a dependency between multiple calls. Once a workflow needs to coordinate the *outcome* of one `RequestExecutor#execute()` call to decide whether or how to run a second one — branching, fan-out across dependent requests, checkpoint/resume, or cross-call retry budgets — that is workflow orchestration and belongs in Dagonizer, not in a loop of `RequestExecutor` calls glued together by hand.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/request-executor

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/request-executor)
