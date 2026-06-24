---
title: '@studnicky/resilience'
description: Composable resilience primitives — circuit breaker, token bucket, and dead-letter queue.
---

# @studnicky/resilience

> Circuit breaker, token bucket rate limiter, and bounded dead-letter queue — composable and independently usable.

## Install

```bash
pnpm add @studnicky/resilience
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

### CircuitBreaker

Tracks failures and opens the circuit after a threshold, then probes with limited calls after a timeout.

<<< ../../packages/resilience/examples/circuit-breaker.ts#usage

### TokenBucket

Leaky-bucket rate limiter; `consume` throws immediately when exhausted, `waitForToken` blocks until tokens refill.

<<< ../../packages/resilience/examples/token-bucket.ts#usage

### DeadLetterQueue

Bounded FIFO queue for items that failed processing. Drain via async generator.

### DeadLetterQueueRetryGenerator — timed re-delivery

<<< ../../packages/resilience/examples/dead-letter-queue.ts#usage

## API

| Export | Type | Description |
|--------|------|-------------|
| `CircuitBreaker` | class | Three-state async circuit breaker |
| `CircuitBreakerOpenError` | class | Thrown when the circuit is open |
| `CircuitBreakerOptionsType` | type | `{ failureThreshold, resetTimeoutMs, successThreshold?, name?, clock? }` |
| `CircuitStateType` | type | `'closed' \| 'open' \| 'halfOpen'` |
| `TokenBucket` | class | Token bucket rate limiter |
| `TokenBucketExhaustedError` | class | Thrown by `consume()` when no tokens remain |
| `TokenBucketOptionsType` | type | `{ requestsPerSecond, burstSize, clock? }` |
| `DeadLetterQueue<T>` | class | Bounded FIFO DLQ with async-generator drain |
| `DlqEntryType<T>` | type | `{ id, item, reason, error?, enqueuedAtMs }` |
| `DeadLetterQueueOptionsType` | type | `{ capacity?, clock?, signal? }` |
| `DeadLetterQueueRetryGenerator<T>` | class | Re-yields DLQ entries with a configurable pause |
| `DeadLetterQueueRetryGeneratorOptionsType` | type | `{ intervalMs }` |
| `DlqFullError` | class | Thrown by `enqueue` when at capacity |
| `DlqClosedError` | class | Thrown by `enqueue` after `close()` |
| `DlqAbortedError` | class | Thrown by `enqueue` after signal abort |

### `CircuitBreaker`

| Member | Signature | Description |
|--------|-----------|-------------|
| `execute` | `<T>(fn: () => Promise<T>) => Promise<T>` | Runs `fn`; throws `CircuitBreakerOpenError` when open |
| `state` | `CircuitStateType` | Current circuit state |
| `reset` | `() => void` | Forces circuit closed |
| `forceOpen` | `() => void` | Forces circuit open |
| `forceClosed` | `() => void` | Alias for `reset` |

### `TokenBucket`

| Member | Signature | Description |
|--------|-----------|-------------|
| `consume` | `(tokens?: number) => void` | Consumes tokens; throws `TokenBucketExhaustedError` if insufficient |
| `waitForToken` | `(tokens?, signal?) => Promise<void>` | Waits until tokens are available, then consumes |
| `available` | `number` | Current token count (triggers a refill calculation) |

### `DeadLetterQueue<T>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `enqueue` | `(item, reason, error?) => void` | Adds item; throws on full, closed, or aborted |
| `drain` | `() => AsyncGenerator<DlqEntryType<T>>` | Yields all entries; suspends when queue is empty |
| `close` | `() => void` | Signals drain to stop after the current entries |
| `abort` | `() => void` | Immediately stops drain |
| `size` | `number` | Current entry count |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/resilience)
