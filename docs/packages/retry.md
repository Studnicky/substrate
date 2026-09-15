---
title: '@studnicky/retry'
description: Retry asynchronous operations with configurable error classification and backoff.
---

# @studnicky/retry

> Retry asynchronous operations and control which failures receive another attempt.

## Install

```bash
pnpm add @studnicky/retry
```

## Usage

Create a `Retry` instance with `Retry.create(config)`, then pass an operation to `execute`.

<<< ../../packages/retry/examples/basicRetry.ts#usage

## Try it

<RunnableExample src="packages/retry/examples/basicRetry" title="Basic retry with backoff" />

## Classify errors

Subclass `Retry` and override `classifyError` to choose retryable failures for your domain.

<<< ../../packages/retry/examples/customClassifier.ts#usage

## Observe retries

Override `onRetryScheduled(context)` to set `delayMs`, stop retrying with `abort`, or retain state between attempts. The remaining hooks observe attempts, successes, retries, and terminal failures. `clock` provides deterministic elapsed-time budgets; `hookTimeoutMs` limits asynchronous hook execution.

<RunnableExample src="packages/retry/examples/observedRetry" title="Observed retry lifecycle" />

## Imports

Import runtime APIs from `@studnicky/retry/node`, configuration entities from `@studnicky/retry/entities`, and contracts from `@studnicky/retry/interfaces`.

## Entities

<!-- inline-ts-ok: published import path -->
```typescript
import { RetryConfigEntity } from '@studnicky/retry/entities';
```

## Interfaces

<!-- inline-ts-ok: published import path -->
```typescript
import type { RetryConfigInterface } from '@studnicky/retry/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `BackoffStrategy` | Provides retry delays. | `@studnicky/retry/node` |
| `BackoffStrategyInterface` | Defines a backoff strategy. | `@studnicky/retry/interfaces` |
| `Retry` | Runs retryable operations. | `@studnicky/retry/node` |
| `MaximumRetriesExceededError` | Represents an exhausted retry budget. | `@studnicky/retry/node` |
| `NonRetryableError` | Represents a non-retryable failure. | `@studnicky/retry/node` |
| `RetryError` | Represents a retry failure. | `@studnicky/retry/node` |
| `RetryConfigInterface` | Defines retry settings. | `@studnicky/retry/interfaces` |
