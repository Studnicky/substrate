---
title: '@studnicky/resilience'
description: "Composable resilience primitives: circuit breaker, token bucket, sliding-window limiter, and dead-letter queue."
---

# @studnicky/resilience

> Circuit breaker, token bucket and sliding-window rate limiters, and a bounded dead-letter queue. Each primitive is independently usable and composable.

## Install

```bash
pnpm add @studnicky/resilience
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

Construct runtime primitives through `@studnicky/resilience/node` in Node or `@studnicky/resilience/browser` in browsers. Schema-backed data declarations live at `@studnicky/resilience/entities`, and type-only contracts live at `@studnicky/resilience/interfaces`.

## Usage

### CircuitBreaker

Tracks failures and opens the circuit after a threshold, then probes with limited calls after a timeout.

<<< ../../packages/resilience/examples/circuit-breaker.ts#usage

### TokenBucket

Token-bucket rate limiter; `consume` throws immediately when exhausted, `waitForToken` blocks until tokens refill. Both operations accept positive finite token counts, including fractional units. An optional `clock` supplies finite, nondecreasing millisecond readings for deterministic tests.

<<< ../../packages/resilience/examples/token-bucket.ts#usage

### SlidingWindowLimiter

Use a sliding window when a limit is a fixed number of requests over a rolling interval. Select `log` for exact accounting or `counter` for a constant-space approximation. Both `consume` and `waitForToken` return the same `RateLimitConsumptionEntity.Type` admission shape as `TokenBucket`.

<!-- inline-ts-ok: Documents the consumer runtime import for the sliding-window limiter. -->
```typescript
import { SlidingWindowExhaustedError, SlidingWindowLimiter } from '@studnicky/resilience/node';

const limiter = SlidingWindowLimiter.create({
  algorithm: 'log',
  limit: 100,
  windowMs: 60_000,
});

try {
  const admission = limiter.consume();
  console.log(admission.remainingTokens);
  await sendRequest();
} catch (error) {
  if (error instanceof SlidingWindowExhaustedError) {
    // The request does not fit in the current rolling window.
  }
}
```

### DeadLetterQueue

Bounded FIFO queue for items that failed processing. Drain via async generator.

### DeadLetterQueueRetryGenerator: timed re-delivery

<<< ../../packages/resilience/examples/dead-letter-queue.ts#usage

## Lifecycle hooks

Subclass a primitive when the application needs lifecycle telemetry. Hooks are protected synchronous methods with no-op defaults. Keep an override fast and non-throwing; the documented operation result and error behavior remain the consumer contract.

### CircuitBreaker hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onSuccess()` | A protected call resolves. | — |
| `onFailure(error)` | A classified circuit failure is recorded. | `error: Error` |
| `onTrip()` | The circuit reaches its failure threshold. | — |
| `onOpen()` | The circuit enters the open state. | — |
| `onHalfOpen()` | The reset timeout opens a probe window. | — |
| `onClose()` | The circuit enters the closed state. | — |
| `onReject()` | A call is rejected while the circuit is open. | — |

### TokenBucket hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onTokenAcquired(count)` | Tokens are deducted by `consume()` or `waitForToken()`. | `count: number` |
| `onTokenDepleted()` | `consume()` cannot admit the requested tokens. | — |
| `onRefill(added)` | Elapsed time adds tokens. | `added: number` |

### SlidingWindowLimiter hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onAllow(count)` | `consume()` admits the requested count. | `count: number` |
| `onReject(count)` | `consume()` rejects the requested count. | `count: number` |
| `onWindowRoll()` | The active rolling window advances. | — |

### DeadLetterQueue hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onEnqueue(item)` | An item is added to the queue. | `item: T` |
| `onDequeue(item)` | An item is yielded from `drain()`. | `item: T` |
| `onOverflow()` | `enqueue()` reaches capacity. | — |
| `onClose()` | `close()` completes. | — |
| `onAbort()` | `abort()` completes. | — |

### DeadLetterQueueRetryGenerator hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onYield(entry)` | `generate()` yields an entry. | `entry: DeadLetterQueueEntryInterface<T>` |
| `onWait(intervalMs)` | `generate()` begins an inter-entry delay. | `intervalMs: number` |
| `onDone()` | `generate()` finishes. | — |

<<< ../../packages/resilience/examples/observedResilience.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Try it

The hooks demo subclasses both `CircuitBreaker` and `DeadLetterQueue` and overrides their lifecycle hooks. Watch the full scenario: two failures trigger `onFailure`, `onTrip`, and `onOpen`; a rejected call triggers `onReject`; advancing the virtual clock into half-open triggers `onHalfOpen`, `onSuccess`, and `onClose`; and DLQ drain emits `onDequeue` for every item recovered from the queue.

<RunnableExample src="packages/resilience/examples/observedResilience" title="Resilience lifecycle hooks" />

<RunnableExample src="packages/resilience/examples/observedSlidingWindowLimiter" title="Sliding-window rate limiting" />

## Exports

| Symbol | Purpose | Import path |
|--------|---------|-------------|
| `CircuitBreaker` | Three-state async circuit breaker. | `@studnicky/resilience/node` |
| `CircuitBreakerOpenError` | Signals a call rejected by an open circuit. | `@studnicky/resilience/node` |
| `CircuitBreakerOptionsInterface` | Caller-supplied circuit-breaker options, including clock and error classifier. | `@studnicky/resilience/interfaces` |
| `DeadLetterQueue<T>` | Bounded FIFO queue with async-generator drain. | `@studnicky/resilience/node` |
| `DeadLetterQueueAbortedError` | Signals enqueue after queue abort. | `@studnicky/resilience/node` |
| `DeadLetterQueueClosedError` | Signals enqueue after queue close. | `@studnicky/resilience/node` |
| `DeadLetterQueueFullError` | Signals enqueue at queue capacity. | `@studnicky/resilience/node` |
| `DeadLetterQueueOptionsInterface` | Caller-supplied queue options, including clock and abort signal. | `@studnicky/resilience/interfaces` |
| `DeadLetterQueueRetryGenerator<T>` | Re-yields queue entries after a configurable pause. | `@studnicky/resilience/node` |
| `DeadLetterQueueRetryGeneratorOptionsInterface<T>` | Caller-supplied retry-generator options with a live queue. | `@studnicky/resilience/interfaces` |
| `ResilienceConfigError` | Signals invalid resilience configuration. | `@studnicky/resilience/node` |
| `RateLimiterClock` | Validates a rate-limit clock before its readings participate in limiter arithmetic. | `@studnicky/resilience/node` |
| `RateLimiterClockInterface` | Callable source of finite, nondecreasing millisecond readings. | `@studnicky/resilience/interfaces` |
| `ResilienceError` | Base error for the package. | `@studnicky/resilience/node` |
| `TokenBucket` | Token-bucket rate limiter. | `@studnicky/resilience/node` |
| `TokenBucketExhaustedError` | Signals insufficient available tokens. | `@studnicky/resilience/node` |
| `TokenBucketOptionsInterface` | Caller-supplied token-bucket options, including clock. | `@studnicky/resilience/interfaces` |
| `SlidingWindowLimiter` | Enforces an exact or approximate sliding-window limit. | `@studnicky/resilience/node` |
| `SlidingWindowExhaustedError` | Signals that a request exceeds available window capacity. | `@studnicky/resilience/node` |
| `SlidingWindowLimiterConfigError` | Signals invalid sliding-window limiter configuration. | `@studnicky/resilience/node` |
| `SlidingWindowLimiterError` | Base error for sliding-window limiter failures. | `@studnicky/resilience/node` |
| `SlidingWindowLimiterOptionsInterface` | Caller-supplied sliding-window limiter options, including algorithm and clock. | `@studnicky/resilience/interfaces` |
| `RateLimitConsumptionEntity` | Schema-derived admission result with `consumedTokens` and `remainingTokens`. | `@studnicky/resilience/entities` |
| `SlidingWindowLimiterOptionsEntity` | Schema-derived sliding-window limiter options. | `@studnicky/resilience/entities` |

## Entities

`@studnicky/resilience/entities` exports all schema-backed configuration, state, event, and effect declarations. Each entity namespace provides `Schema`, `Type`, and `validate`.

<!-- inline-ts-ok: Documents the entities subpath import. -->
```typescript
import { CircuitBreakerOptionsEntity } from '@studnicky/resilience/entities';
```

## Interfaces

`@studnicky/resilience/interfaces` exports type-only event, effect, queue-entry, and option contracts.

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
| `consume` | `(tokens?: number) => RateLimitConsumptionEntity.Type` | Consumes a positive finite token count and returns the admission; throws `TokenBucketExhaustedError` if insufficient |
| `waitForToken` | `(options?: { tokens?: number; signal?: AbortSignal }) => Promise<RateLimitConsumptionEntity.Type>` | Waits until a positive finite token count is available, then returns the admission |
| `available` | `number` | Current token count (triggers a refill calculation) |

### `SlidingWindowLimiter`

| Member | Signature | Description |
|--------|-----------|-------------|
| `consume` | `(tokens?: number) => RateLimitConsumptionEntity.Type` | Consumes a positive count when it fits within the rolling window. |
| `waitForToken` | `(options?: { tokens?: number; signal?: AbortSignal }) => Promise<RateLimitConsumptionEntity.Type>` | Waits until the requested count fits within the rolling window. |

### `DeadLetterQueue<T>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `enqueue` | `(item, reason, error?) => void` | Adds item; throws on full, closed, or aborted |
| `drain` | `() => AsyncGenerator<DeadLetterQueueEntryInterface<T>>` | Yields all entries; suspends when queue is empty |
| `close` | `() => void` | Signals drain to stop after the current entries |
| `abort` | `() => void` | Immediately stops drain |
| `size` | `get size(): number` | Current entry count |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/resilience)
