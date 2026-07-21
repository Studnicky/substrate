---
title: '@studnicky/retry'
description: Generic async retry with extensible error classification and backoff strategies.
---

# @studnicky/retry

> Generic async retry utility with extensible error classification.

## Install

```bash
pnpm add @studnicky/retry
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

Create a `Retry` instance with `Retry.create(config)`, then pass any operation to `execute`. The instance tracks stats and retries on transient failures:

<<< ../../packages/retry/examples/basicRetry.ts#usage

## Try it

<RunnableExample src="packages/retry/examples/basicRetry" title="Basic retry with backoff" />

The output shows `Retry.create({ maxRetries: 3 })`, the operation failing twice before succeeding on the third attempt, and final stats reporting 2 retries.

### Lifecycle hooks

`TelemetryRetry` subclasses `Retry` and overrides `onAttempt`, `onRetryableError`, `onRetryScheduled`, `onGiveUp`, and `enterCall`. Each hook logs its FSM transition as the retry cycle runs, and the give-up event fires after the `maxRetries=2` budget is exhausted.

<RunnableExample src="packages/retry/examples/observedRetry" title="Observed retry — lifecycle hook trace" />

## Public API

Import `Retry`, `BackoffStrategy`, the retry entities and guards, `MaxRetriesExceededError`, `NonRetryableError`, `RetryError`, and the public retry interfaces from `@studnicky/retry`. The package root is the only public code entrypoint; algorithm constants are implementation details.

## Custom error classification

Subclass `Retry` and override `classifyError` to control which errors are retryable for your domain:

<<< ../../packages/retry/examples/customClassifier.ts#usage

## Observability hooks

`classifyError(error, attemptNumber)` and `onRetryScheduled(context)` are the in-band behavioral seams. Override them to define retryability and scheduling policy: `classifyError(...)` decides whether an error is retryable for your domain, and `onRetryScheduled(context)` can set `context.delayMs` (using a shipped `BackoffStrategy`), set `context.abort` to stop retrying, or mutate `context.state` across attempts (it may be async). The observation-only hooks — `onAttempt`, `onSuccess`, `onRetryableError`, `onGiveUp`, `enterCall` — let you collect telemetry without coupling the retry core to any metrics library:

<<< ../../packages/retry/examples/observedRetry.ts#usage

The base class never calls any logger or metrics library. Observer hooks are no-ops by default and stay observational; by default `onRetryScheduled` leaves `delayMs` at 0, so retries fire immediately unless a backoff is applied.

The observation-only hooks run through a composed `HookInvoker` (see [`@studnicky/errors`](/packages/errors#hookinvoker)). Pass `hookTimeoutMs` to `Retry.create({ hookTimeoutMs })` to bound how long an async hook may run before it fails through `onHookError` with a `HookTimeoutError` cause. Left unset, a hook may take arbitrarily long.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/retry)
