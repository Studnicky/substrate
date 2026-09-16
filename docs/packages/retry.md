---
title: '@studnicky/retry'
description: Retry asynchronous operations with configurable failure classification, backoff, and typed lifecycle events.
---

# @studnicky/retry

> Retry asynchronous operations and publish detached lifecycle snapshots to your event sink.

## Install

```bash
pnpm add @studnicky/retry @studnicky/event-bus
```

## Runtime imports

Import runtime APIs from `@studnicky/retry/node` in Node or `@studnicky/retry/browser` in browsers. Import schema declarations from `@studnicky/retry/entities` and contracts from `@studnicky/retry/interfaces`.

## Usage

Create a `Retry` instance with `Retry.create(config)`, then pass an operation to `execute`.

<<< ../../packages/retry/examples/basicRetry.ts#usage

## Try it

<RunnableExample src="packages/retry/examples/basicRetry" title="Basic retry with backoff" />

## Classify errors

Subclass `Retry` and override `classifyError` to choose retryable failures for your domain.

<<< ../../packages/retry/examples/customClassifier.ts#usage

## Publish lifecycle events

Pass an EventSinkInterface through eventSink. EventBus satisfies the interface directly, and the sink receives frozen JSON snapshots. Event publication is advisory: a sink cannot change retry timing, results, terminal errors, or control state.

<<< ../../packages/retry/examples/eventSinkRetry.ts

<RunnableExample src="packages/retry/examples/eventSinkRetry" title="Retry lifecycle events through EventBus" />

| Topic | Payload |
|---|---|
| attempt | Attempt number and elapsed time. |
| retryScheduled | Final attempt, delay, elapsed-time, and abort values after the scheduling hook. |
| success | Successful attempt number and elapsed time. |

## Control retry behavior

Use `backoffStrategy` for standard delays. Override `onRetryScheduled` only when the application needs to set `delayMs`, `abort`, or retained retry state.

<RunnableExample src="packages/retry/examples/observedRetry" title="Retry behavior controls" />

## Imports

Use the runtime entry point for the active platform; configuration entities and contracts remain runtime-neutral.

## Entities

<!-- inline-ts-ok: published import path -->
```typescript
import { RetryAttemptEventEntity, RetrySuccessEventEntity } from "@studnicky/retry/entities";
```

## Interfaces

<!-- inline-ts-ok: published import path -->
```typescript
import type { RetryConfigInterface, RetryEventTopicMapInterface } from "@studnicky/retry/interfaces";
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `BackoffStrategy` | Provides retry delays. | `@studnicky/retry/node` |
| `Retry` | Runs retryable operations. | `@studnicky/retry/node` |
| `MaximumRetriesExceededError` | Represents an exhausted retry budget. | `@studnicky/retry/node` |
| `NonRetryableError` | Represents a non-retryable failure. | `@studnicky/retry/node` |
| `RetryError` | Represents a retry failure. | `@studnicky/retry/node` |
| `RetryAttemptEventEntity` | Validates attempt-event snapshots. | `@studnicky/retry/entities` |
| `RetrySuccessEventEntity` | Validates success-event snapshots. | `@studnicky/retry/entities` |
| `RetryConfigInterface` | Defines retry settings, including eventSink. | `@studnicky/retry/interfaces` |
| `RetryEventTopicMapInterface` | Defines lifecycle event topics. | `@studnicky/retry/interfaces` |
