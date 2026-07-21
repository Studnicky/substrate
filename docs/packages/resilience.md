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

`@studnicky/resilience` is the sole public code entrypoint. Construct each primitive through its root-exported `create(options)` factory.

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
| `onYield(entry)` | Immediately before each entry is yielded from `generate()` | `entry: DlqEntryInterface<T>` |
| `onWait(intervalMs)` | Before each inter-entry delay | `intervalMs: number` |
| `onDone()` | When the generator finishes (DLQ closed or aborted) | — |

`CircuitBreaker`, `DeadLetterQueue`, `DeadLetterQueueRetryGenerator`, and `TokenBucket` each use an owner-bound, instance-local hook recorder. A lifecycle hook that throws or rejects adds a `HookInvocationError` to that instance's protected `hookErrors` array; the entry's `cause` is the exact thrown or rejected value. Subclasses can inspect `hookErrors`, and the classes expose no public hook-error getter. Hook failures do not replace the primitive's canonical result or error.

<<< ../../packages/resilience/examples/observedResilience.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Try it

The hooks demo subclasses both `CircuitBreaker` and `DeadLetterQueue` and overrides their lifecycle hooks. Watch the full scenario: two failures trigger `onFailure`, `onTrip`, and `onOpen`; a rejected call triggers `onReject`; advancing the virtual clock into half-open triggers `onHalfOpen`, `onSuccess`, and `onClose`; and DLQ drain emits `onDequeue` for every item recovered from the queue.

<RunnableExample src="packages/resilience/examples/observedResilience" title="Resilience lifecycle hooks" />

## API

| Export | Type | Description |
|--------|------|-------------|
| `CircuitBreaker` | class | Three-state async circuit breaker |
| `CircuitBreakerOpenError` | class | Thrown when the circuit is open |
| `CircuitBreakerOptionsEntity` | namespace | JSON Schema, derived `Type`, and validator for serializable circuit-breaker options |
| `CircuitBreakerOptionsInterface` | interface | Circuit-breaker options plus runtime `clock` and error-classifier contracts |
| `CircuitStateEntity` | namespace | JSON Schema, derived `Type`, and validator for `closed`, `halfOpen`, and `open` states |
| `TokenBucket` | class | Token bucket rate limiter |
| `TokenBucketExhaustedError` | class | Thrown by `consume()` when no tokens remain |
| `TokenBucketOptionsEntity` | namespace | JSON Schema, derived `Type`, and validator for serializable token-bucket options |
| `TokenBucketOptionsInterface` | interface | Token-bucket options plus the runtime `clock` contract |
| `DeadLetterQueue<T>` | class | Bounded FIFO DLQ with async-generator drain |
| `DlqEntryInterface<T>` | interface | Runtime queue entry containing caller-owned `T` and an `Error \| undefined` value |
| `DeadLetterQueueOptionsEntity` | namespace | JSON Schema, derived `Type`, and validator for serializable queue options |
| `DeadLetterQueueOptionsInterface` | interface | Queue options plus runtime `clock` and `AbortSignal` contracts |
| `DeadLetterQueueRetryGenerator<T>` | class | Re-yields DLQ entries with a configurable pause |
| `DeadLetterQueueRetryGeneratorOptionsEntity` | namespace | JSON Schema, derived `Type`, and validator for `intervalMs` |
| `DeadLetterQueueRetryGeneratorOptionsInterface<T>` | interface | Retry timing options plus the live `DeadLetterQueue<T>` instance |
| `DlqFullError` | class | Thrown by `enqueue` when at capacity |
| `DlqClosedError` | class | Thrown by `enqueue` after `close()` |
| `DlqAbortedError` | class | Thrown by `enqueue` after signal abort |
| `ResilienceConfigError` | class | Thrown when resilience configuration is invalid |
| `ResilienceError` | class | Base error for the package |

### Declaration boundaries

Entity namespaces own JSON-compatible data. Each entity exposes `Schema`, a schema-derived `Type`, and `validate`. `CircuitStateEntity.Type` is the canonical circuit-state data type.

Interfaces describe contracts that include runtime values or access policy. `DlqEntryInterface<T>` remains a runtime contract because the payload is caller-defined and `error` is an `Error` instance. Retry-generator options compose the schema-owned `DeadLetterQueueRetryGeneratorOptionsEntity.Type` with a live queue through `DeadLetterQueueRetryGeneratorOptionsInterface<T>`.

Entity source files import `JSONSchema` and `FromSchema` directly from `json-schema-to-ts` and `ValidateFunction` directly from `ajv`. `@studnicky/resilience` declares both owner packages directly and does not acquire dependency-owned declarations through a substrate proxy export.

All classes, errors, entity namespaces, and type-only interfaces listed above are imported from `@studnicky/resilience`.

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
| `drain` | `() => AsyncGenerator<DlqEntryInterface<T>>` | Yields all entries; suspends when queue is empty |
| `close` | `() => void` | Signals drain to stop after the current entries |
| `abort` | `() => void` | Immediately stops drain |
| `size` | `get size(): number` | Current entry count |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/resilience)
