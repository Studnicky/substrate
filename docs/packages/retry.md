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

Build a `Retry` instance with the builder, then pass any operation to `execute`. The instance tracks stats and retries on transient failures:

<<< ../../packages/retry/examples/basicRetry.ts#usage

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/retry` | `Retry`, `RetryBuilder`, `DefaultHttpErrorClassifier`, `ErrorClassifier`, errors, type guards |
| `@studnicky/retry/backoff` | Backoff strategy helpers |
| `@studnicky/retry/constants` | Default configuration constants |
| `@studnicky/retry/errors` | `ConfigurationError`, `MaxRetriesExceededError`, `NonRetryableError`, `RetryError` |
| `@studnicky/retry/interfaces` | Interface types |
| `@studnicky/retry/matchers` | Error matcher utilities |
| `@studnicky/retry/types` | `BackoffStrategyType`, `ErrorClassifierFunctionType`, `RetryInterceptorType` |

## Custom error classification

Subclass `Retry` and override `classifyError` to control which errors are retryable for your domain:

<<< ../../packages/retry/examples/customClassifier.ts#usage

## Observability hooks

Override `onRetryScheduled` and `onGiveUp` to collect telemetry without coupling the retry core to any metrics library:

<<< ../../packages/retry/examples/observedRetry.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/retry)
