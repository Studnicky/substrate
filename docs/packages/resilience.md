---
title: '@studnicky/resilience'
description: "Composable resilience primitives: circuit breaker, token bucket, and dead-letter queue."
---

# @studnicky/resilience

> Circuit breaker, token bucket rate limiter, and bounded dead-letter queue. Each primitive is independently usable and composable.

## Install

```bash
pnpm add @studnicky/resilience
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

Construct runtime primitives through the package root. Schema-backed data declarations live at `@studnicky/resilience/entities`, and type-only contracts live at `@studnicky/resilience/interfaces`.

## Usage

### CircuitBreaker

Tracks failures and opens the circuit after a threshold, then probes with limited calls after a timeout.

<<< ../../packages/resilience/examples/circuit-breaker.ts#usage

### TokenBucket

Token-bucket rate limiter; `consume` throws immediately when exhausted, `waitForToken` blocks until tokens refill.

<<< ../../packages/resilience/examples/token-bucket.ts#usage

### DeadLetterQueue

Bounded FIFO queue for items that failed processing. Drain via async generator.

### DeadLetterQueueRetryGenerator: timed re-delivery

<<< ../../packages/resilience/examples/dead-letter-queue.ts#usage

## Observability hooks

Subclass any primitive and override protected hooks to add logging, metrics, or tracing without coupling the core to any observability library.

### CircuitBreaker hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onSuccess()` | After `fn()` resolves in any state | — |
| `onFailure(error)` | After `fn()` throws in any state | `error: unknown` |
| `onTrip()` | When failure threshold is reached and state transitions closed → open | — |
| `onOpen()` | Every time state becomes open (threshold trip or halfOpen → open on failure) | — |
| `onHalfOpen()` | When state transitions open → halfOpen after `resetTimeoutMs` | — |
| `onClose()` | When state becomes closed (success threshold reached in halfOpen or manual reset) | — |
| `onReject()` | When a call is short-circuited because the circuit is open | — |

### TokenBucket hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onTokenAcquired(count)` | After `consume()` or `waitForToken()` successfully deducts tokens | `count: number` |
| `onTokenDepleted()` | When `consume()` finds insufficient tokens (before throwing) | — |
| `onRefill(added)` | When the internal refill adds tokens due to elapsed time | `added: number` |

### DeadLetterQueue hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onEnqueue(item)` | After an item is added to the queue | `item: T` |
| `onDequeue(item)` | After an item is shifted from the queue during drain | `item: T` |
| `onOverflow()` | When `enqueue()` is called on a full queue (before throwing) | — |
| `onClose()` | At the end of `close()` | — |
| `onAbort()` | At the end of `abort()` | — |

### DeadLetterQueueRetryGenerator hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onYield(entry)` | Immediately before each entry is yielded from `generate()` | `entry: DeadLetterQueueEntryInterface<T>` |
| `onWait(intervalMs)` | Before each inter-entry delay | `intervalMs: number` |
| `onDone()` | When the generator finishes (DLQ closed or aborted) | — |

`CircuitBreaker`, `DeadLetterQueue`, `DeadLetterQueueRetryGenerator`, and `TokenBucket` each use an owner-bound, instance-local hook recorder. A lifecycle hook that throws or rejects adds a `HookInvocationError` to that instance's protected `hookErrors` array; the entry's `cause` is the exact thrown or rejected value. Subclasses can inspect `hookErrors`, and the classes expose no public hook-error getter. Hook failures do not replace the primitive's canonical result or error.

<<< ../../packages/resilience/examples/observedResilience.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Try it

The hooks demo subclasses both `CircuitBreaker` and `DeadLetterQueue` and overrides their lifecycle hooks. Watch the full scenario: two failures trigger `onFailure`, `onTrip`, and `onOpen`; a rejected call triggers `onReject`; advancing the virtual clock into half-open triggers `onHalfOpen`, `onSuccess`, and `onClose`; and DLQ drain emits `onDequeue` for every item recovered from the queue.

<RunnableExample src="packages/resilience/examples/observedResilience" title="Resilience lifecycle hooks" />

## Exports

| Symbol | Purpose | Import path |
|--------|---------|-------------|
| `CircuitBreaker` | Three-state async circuit breaker. | `@studnicky/resilience` |
| `CircuitBreakerOpenError` | Signals a call rejected by an open circuit. | `@studnicky/resilience` |
| `CircuitBreakerOptionsInterface` | Caller-supplied circuit-breaker options, including clock and error classifier. | `@studnicky/resilience` |
| `DeadLetterQueue<T>` | Bounded FIFO queue with async-generator drain. | `@studnicky/resilience` |
| `DeadLetterQueueAbortedError` | Signals enqueue after queue abort. | `@studnicky/resilience` |
| `DeadLetterQueueClosedError` | Signals enqueue after queue close. | `@studnicky/resilience` |
| `DeadLetterQueueFullError` | Signals enqueue at queue capacity. | `@studnicky/resilience` |
| `DeadLetterQueueOptionsInterface` | Caller-supplied queue options, including clock and abort signal. | `@studnicky/resilience` |
| `DeadLetterQueueRetryGenerator<T>` | Re-yields queue entries after a configurable pause. | `@studnicky/resilience` |
| `DeadLetterQueueRetryGeneratorOptionsInterface<T>` | Caller-supplied retry-generator options with a live queue. | `@studnicky/resilience` |
| `ResilienceConfigError` | Signals invalid resilience configuration. | `@studnicky/resilience` |
| `ResilienceError` | Base error for the package. | `@studnicky/resilience` |
| `TokenBucket` | Token-bucket rate limiter. | `@studnicky/resilience` |
| `TokenBucketExhaustedError` | Signals insufficient available tokens. | `@studnicky/resilience` |
| `TokenBucketOptionsInterface` | Caller-supplied token-bucket options, including clock. | `@studnicky/resilience` |

## Entities

`@studnicky/resilience/entities` exports all schema-backed configuration, state, event, and effect declarations. Each entity namespace provides `Schema`, `Type`, and `validate`.

<!-- inline-ts-ok: Documents the entities subpath import. -->
```typescript
import { CircuitBreakerOptionsEntity } from '@studnicky/resilience/entities';
```

## Interfaces

`@studnicky/resilience/interfaces` exports type-only event, effect, queue-entry, and option contracts. Option interfaces that callers pass to public factories are also available from the package root.

<!-- inline-ts-ok: Documents the interfaces subpath import. -->
```typescript
import type { DeadLetterQueueEntryInterface } from '@studnicky/resilience/interfaces';
```

### `CircuitBreaker`

| Member | Signature | Description |
|--------|-----------|-------------|
| `execute` | `<T>(fn: () => Promise<T>) => Promise<T>` | Runs `fn`; throws `CircuitBreakerOpenError` when open |
| `state` | `get state(): CircuitStateEntity.Type` | Current circuit state |
| `reset` | `() => void` | Restores the closed state and clears failure counters |
| `forceOpen` | `() => void` | Forces circuit open |

### `TokenBucket`

| Member | Signature | Description |
|--------|-----------|-------------|
| `consume` | `(tokens?: number) => void` | Consumes tokens; throws `TokenBucketExhaustedError` if insufficient |
| `waitForToken` | `(options?: { tokens?: number; signal?: AbortSignal }) => Promise<void>` | Waits until tokens are available, then consumes |
| `available` | `number` | Current token count (triggers a refill calculation) |

### `DeadLetterQueue<T>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `enqueue` | `(item, reason, error?) => void` | Adds item; throws on full, closed, or aborted |
| `drain` | `() => AsyncGenerator<DeadLetterQueueEntryInterface<T>>` | Yields all entries; suspends when queue is empty |
| `close` | `() => void` | Signals drain to stop after the current entries |
| `abort` | `() => void` | Immediately stops drain |
| `size` | `get size(): number` | Current entry count |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/resilience)
