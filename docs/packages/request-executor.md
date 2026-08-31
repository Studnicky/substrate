---
title: '@studnicky/request-executor'
description: One-shot request execution pattern composing fetch, retry, signal, and an optional scope port.
---

# @studnicky/request-executor

> One-shot request execution pattern composing `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, and an optional scope port.

## Install

```bash
pnpm add @studnicky/request-executor
```

## Usage

`RequestExecutor` does not perform HTTP calls itself — the caller's `fn` receives the supplied `FetchClientInterface` and a composed `AbortSignal` (merged from a caller-supplied `AbortSignal` and/or `deadlineMs` via `Signal#compose()`) and decides which verb to call. The call runs through the composed `Retry` loop, bracketed by the `onExecuteStart`/`onExecuteComplete`/`onExecuteError` lifecycle hooks; an optional scope factory runs the whole call inside a fresh scope:

<<< ../../packages/request-executor/examples/observedRequestExecutor.ts#usage

## Try it

<RunnableExample src="packages/request-executor/examples/browserRequestExecutor" title="BrowserFetchClient, Retry, and RequestExecutor" />

The output shows the native browser client retrying two temporary failures and resolving the final response through the same executor contract used by server consumers.

## Lifecycle hooks

`RequestExecutor` exposes three protected lifecycle hooks, no-ops by default: `onExecuteStart()` fires before the retry loop begins, `onExecuteComplete<T>(result)` fires after it resolves, and `onExecuteError(error)` fires once retries are exhausted. All three run through an internal `HookInvoker` that records a throwing override without replacing `execute()`'s resolved result or thrown error. The fetch client is an explicit runtime adapter; retry and signal retain their portable defaults:

| Config key | Accepts | Default |
|------------|---------|---------|
| `fetchClient` | `FetchClientInterface`, including `BrowserFetchClient` or the Node adapter | Required |
| `retry` | `Retry` instance or `RetryConfigInterface` from `@studnicky/retry` | `Retry.create({})` |
| `signal` | `Signal` instance | `Signal.create()` |
| `scope` | `RequestScopeFactoryInterface` | `undefined` — no scope wrapping |
| `deadlineMs` | Default deadline (ms) for calls that don't pass their own | `undefined` |

Callers retain references to supplied fetch client, retry, signal, and scope implementations when they need those primitives' own hooks or state. The executor never re-exposes a stage a wrapped primitive already owns.

Import `RequestExecutor` from `@studnicky/request-executor`, its schema namespace from `@studnicky/request-executor/entities`, and its type contracts from `@studnicky/request-executor/interfaces`. Import a runtime fetch adapter from `@studnicky/fetch/browser` or `@studnicky/fetch/node`.

## Composition order

The optional request scope wraps the whole call → `onExecuteStart`/`onExecuteComplete`/`onExecuteError` bracket the retry loop → `retry` loop wraps the caller's `fn` → the composed cancellation `AbortSignal` threads into whatever call `fn` makes.

## When this composition tips into orchestration

`RequestExecutor` executes exactly one call (with its own internal retry attempts). It has no concept of a node, a graph, or a dependency between multiple calls. Once a workflow needs to coordinate the *outcome* of one `RequestExecutor#execute()` call to decide whether or how to run a second one — branching, fan-out across dependent requests, checkpoint/resume, or cross-call retry budgets — that is workflow orchestration, not a loop of `RequestExecutor` calls glued together by hand.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/request-executor

## Entities

`@studnicky/request-executor/entities` exports request deadline schemas.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import { RequestDeadlineEntity } from '@studnicky/request-executor/entities';
```

## Interfaces

`@studnicky/request-executor/interfaces` exports executor configuration, dependency, and execution-option contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import type { RequestExecutorConfigInterface } from '@studnicky/request-executor/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `RequestExecutor` | Composes request dependencies for a retried one-shot call. | `@studnicky/request-executor` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/request-executor)
