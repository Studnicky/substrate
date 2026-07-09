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
| `fetchClient` | `FetchClient` instance or `ClientConfigType` | `FetchClient.create({})` |
| `retry` | `Retry` instance or `Partial<RetryConfigInterface>` | `Retry.create({})` |
| `signal` | `Signal` instance | `Signal.create()` |
| `timing` | `Timing` instance | `undefined` — no span recorded |
| `context` | `Context` instance | `undefined` — no scope wrapping |
| `deadlineMs` | Default deadline (ms) for calls that don't pass their own | `undefined` |

| Getter | Returns |
|--------|---------|
| `getFetchClient()` | The composed `FetchClient` instance |
| `getRetry()` | The composed `Retry` instance |
| `getSignal()` | The composed `Signal` instance |
| `getTiming()` | The composed `Timing` instance, or `undefined` |
| `getContext()` | The composed `Context` instance, or `undefined` |

Every getter returns the exact instance passed to `create()`/`builder()` — never a copy or wrapper. A caller who subclassed `FetchClient` for auth headers, `Retry` for custom backoff or classification, or `Timing`/`Context` for correlation keeps full access to those subclasses' own hooks; `RequestExecutor` never re-exposes a stage a wrapped primitive's hook already covers (no redundant "before request" hook, no redundant "before attempt" hook).

## Composition order

`context` scope wraps the whole call → `timing` span brackets the retry loop → `retry` loop wraps the caller's `fn` → the composed cancellation `AbortSignal` threads into whatever call `fn` makes.

## When to stop using this and move to Dagonizer

`RequestExecutor` executes exactly one call (with its own internal retry attempts). It has no concept of a node, a graph, or a dependency between multiple calls. Once a workflow needs to coordinate the *outcome* of one `RequestExecutor#execute()` call to decide whether or how to run a second one — branching, fan-out across dependent requests, checkpoint/resume, or cross-call retry budgets — that is workflow orchestration and belongs in Dagonizer, not in a loop of `RequestExecutor` calls glued together by hand.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/request-executor

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/request-executor)
