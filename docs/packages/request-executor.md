---
title: '@studnicky/request-executor'
description: One-shot request execution pattern composing fetch, retry, signal, and context.
---

# @studnicky/request-executor

> One-shot request execution pattern composing `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, and `@studnicky/context`.

## Install

```bash
pnpm add @studnicky/request-executor
```

## Usage

`RequestExecutor` does not perform HTTP calls itself — the caller's `fn` receives the composed `FetchClient` and a composed `AbortSignal` (merged from a caller-supplied `AbortSignal` and/or `deadlineMs` via `Signal#compose()`) and decides which verb to call. The call runs through the composed `Retry` loop, bracketed by the `onExecuteStart`/`onExecuteComplete`/`onExecuteError` lifecycle hooks; an optional `Context` runs the whole call inside a fresh scope:

<<< ../../packages/request-executor/examples/observedRequestExecutor.ts#usage

## Lifecycle hooks

`RequestExecutor` exposes three protected lifecycle hooks, no-ops by default: `onExecuteStart()` fires before the retry loop begins, `onExecuteComplete<T>(result)` fires after it resolves, and `onExecuteError(error)` fires once retries are exhausted. All three run through an internal `HookInvoker` that swallows a throwing override — a rejected hook is recorded (see `hookErrorCount`/`getHookErrors()`) but never replaces `execute()`'s resolved result or thrown error. Each composed primitive accepts either a pre-built instance (subclassed or not) or the config shape passed straight to that primitive's own `create()`:

| Config key | Accepts | Default |
|------------|---------|---------|
| `fetchClient` | `FetchClient` instance or `ClientConfigInterface` from `@studnicky/fetch` | `FetchClient.create({})` |
| `retry` | `Retry` instance or `RetryConfigInterface` from `@studnicky/retry` | `Retry.create({})` |
| `signal` | `Signal` instance | `Signal.create()` |
| `context` | `Context` instance | `undefined` — no scope wrapping |
| `deadlineMs` | Default deadline (ms) for calls that don't pass their own | `undefined` |

Callers retain references to any `FetchClient`, `Retry`, `Signal`, or `Context` instances supplied to `RequestExecutor.create(config)` when they need those primitives' own hooks or state. The executor never re-exposes a stage a wrapped primitive already owns.

Import `RequestExecutor`, `RequestExecutorConfigInterface`, `RequestExecutorDepsInterface`, and `RequestExecutorExecuteOptionsInterface` from `@studnicky/request-executor`. The package root is the only public code entrypoint. Import dependency-owned configuration and context contracts directly from their owning package roots.

## Composition order

`context` scope wraps the whole call → `onExecuteStart`/`onExecuteComplete`/`onExecuteError` bracket the retry loop → `retry` loop wraps the caller's `fn` → the composed cancellation `AbortSignal` threads into whatever call `fn` makes.

## When this composition tips into orchestration

`RequestExecutor` executes exactly one call (with its own internal retry attempts). It has no concept of a node, a graph, or a dependency between multiple calls. Once a workflow needs to coordinate the *outcome* of one `RequestExecutor#execute()` call to decide whether or how to run a second one — branching, fan-out across dependent requests, checkpoint/resume, or cross-call retry budgets — that is workflow orchestration, not a loop of `RequestExecutor` calls glued together by hand.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/request-executor

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/request-executor)
