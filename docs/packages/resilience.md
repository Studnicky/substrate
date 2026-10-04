---
title: "@studnicky/resilience"
description: "Composable resilience primitives: retry, circuit breaker, token bucket, keyed limiter, sliding-window limiter, and dead-letter queue."
---

# @studnicky/resilience

> Retry/backoff, circuit breaker, token bucket and sliding-window rate limiters, and a bounded dead-letter queue. Each primitive is independently usable and composable.

## Install

```bash
pnpm add @studnicky/resilience
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

Construct core runtime primitives through `@studnicky/resilience/node` in Node or `@studnicky/resilience/browser` in browsers. Retry uses `@studnicky/resilience/retry/node` or `@studnicky/resilience/retry/browser`; its schema-backed data and type-only contracts live at `@studnicky/resilience/retry/entities` and `@studnicky/resilience/retry/interfaces`. Core schema-backed data declarations live at `@studnicky/resilience/entities`, and core type-only contracts live at `@studnicky/resilience/interfaces`.

## Northstar Books supplier boundary

Northstar Books protects catalogue and inventory-supplier calls at three different failure boundaries. A circuit breaker stops repeated requests to an unhealthy supplier; a token bucket limits the process-wide demand budget; and a dead-letter queue retains a rejected replenishment task for deliberate recovery. `KeyedRateLimiter` from `@studnicky/resilience/keyed` gives each supplier account or tenant an independent budget while bounded key retention prevents an unbounded registry.

Each primitive makes one guarantee only: breakers reject while their circuit is open, limiters admit only available local capacity, and queues retain only their bounded in-memory entries. These controls do not replace a supplier-wide or durable distributed rate limit; Northstar applies those at the supplier or persistence boundary.

## Usage

### Retry

`Retry` executes an operation until it succeeds, its retry budget is exhausted, or its caller-supplied error classifier rejects the failure. Import the executable primitive from `@studnicky/resilience/retry/node` or `@studnicky/resilience/retry/browser`; keep Retry configuration and collaborator contracts at `@studnicky/resilience/retry/interfaces`.

### CircuitBreaker

Tracks failures and opens the circuit after a threshold, then probes with limited calls after a timeout.

<<< ../../packages/resilience/examples/circuit-breaker.ts#usage

### TokenBucket

Token-bucket rate limiter; `consume` throws immediately when exhausted, `waitForToken` blocks until tokens refill. Both operations accept positive finite token counts, including fractional units. An optional `clock` supplies finite, nondecreasing millisecond readings for deterministic tests.

<<< ../../packages/resilience/examples/token-bucket.ts#usage

### KeyedRateLimiter

`KeyedRateLimiter` creates one rate-limiting strategy per key, using `TokenBucket` by default. `maximumKeys` bounds the key registry and `keyIdleTtlMs` evicts idle strategies.

<<< ../../packages/resilience/examples/observedKeyedRateLimiter.ts#usage

### SlidingWindowLimiter

Use a sliding window when a limit is a fixed number of requests over a rolling interval. Select `log` for exact accounting or `counter` for a constant-space approximation. Both `consume` and `waitForToken` return the same `RateLimitConsumptionEntity.Type` admission shape as `TokenBucket`.

<!-- inline-ts-ok: Documents the consumer runtime import for the sliding-window limiter. -->

```typescript
import { SlidingWindowExhaustedError, SlidingWindowLimiter } from "@studnicky/resilience/node";

const limiter = SlidingWindowLimiter.create({
  algorithm: "log",
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

| Hook               | When it fires                                 | Args           |
| ------------------ | --------------------------------------------- | -------------- |
| `onSuccess()`      | A protected call resolves.                    | —              |
| `onFailure(error)` | A classified circuit failure is recorded.     | `error: Error` |
| `onTrip()`         | The circuit reaches its failure threshold.    | —              |
| `onOpen()`         | The circuit enters the open state.            | —              |
| `onHalfOpen()`     | The reset timeout opens a probe window.       | —              |
| `onClose()`        | The circuit enters the closed state.          | —              |
| `onReject()`       | A call is rejected while the circuit is open. | —              |

### TokenBucket hooks

| Hook                     | When it fires                                           | Args            |
| ------------------------ | ------------------------------------------------------- | --------------- |
| `onTokenAcquired(count)` | Tokens are deducted by `consume()` or `waitForToken()`. | `count: number` |
| `onTokenDepleted()`      | `consume()` cannot admit the requested tokens.          | —               |
| `onRefill(added)`        | Elapsed time adds tokens.                               | `added: number` |

### SlidingWindowLimiter hooks

| Hook              | When it fires                            | Args            |
| ----------------- | ---------------------------------------- | --------------- |
| `onAllow(count)`  | `consume()` admits the requested count.  | `count: number` |
| `onReject(count)` | `consume()` rejects the requested count. | `count: number` |
| `onWindowRoll()`  | The active rolling window advances.      | —               |

### DeadLetterQueue hooks

| Hook              | When it fires                      | Args      |
| ----------------- | ---------------------------------- | --------- |
| `onEnqueue(item)` | An item is added to the queue.     | `item: T` |
| `onDequeue(item)` | An item is yielded from `drain()`. | `item: T` |
| `onOverflow()`    | `enqueue()` reaches capacity.      | —         |
| `onClose()`       | `close()` completes.               | —         |
| `onAbort()`       | `abort()` completes.               | —         |

### DeadLetterQueueRetryGenerator hooks

| Hook                 | When it fires                             | Args                                      |
| -------------------- | ----------------------------------------- | ----------------------------------------- |
| `onYield(entry)`     | `generate()` yields an entry.             | `entry: DeadLetterQueueEntryInterface<T>` |
| `onWait(intervalMs)` | `generate()` begins an inter-entry delay. | `intervalMs: number`                      |
| `onDone()`           | `generate()` finishes.                    | —                                         |

<<< ../../packages/resilience/examples/observedResilience.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Try it

The hooks demo subclasses both `CircuitBreaker` and `DeadLetterQueue` and overrides their lifecycle hooks. Watch the full scenario: two failures trigger `onFailure`, `onTrip`, and `onOpen`; a rejected call triggers `onReject`; advancing the virtual clock into half-open triggers `onHalfOpen`, `onSuccess`, and `onClose`; and DLQ drain emits `onDequeue` for every item recovered from the queue.

<RunnableExample src="packages/resilience/examples/observedResilience" title="Resilience lifecycle hooks" />

<RunnableExample src="packages/resilience/examples/observedSlidingWindowLimiter" title="Sliding-window rate limiting" />

<RunnableExample src="packages/resilience/examples/observedKeyedRateLimiter" title="Per-key token buckets with LRU eviction" />

## What it is

`@studnicky/resilience` is a collection of independently composable retry, circuit-breaker, rate-limiting, and bounded dead-letter primitives. Each primitive makes a local control-flow or capacity guarantee; the package does not provide a supplier integration, durable queue, distributed limiter, or recovery product.

## What it is for

Northstar Books composes these primitives at supplier and inventory boundaries: it retries a transient catalogue fetch, stops calls to an unhealthy vendor, budgets local demand, gives each vendor account its own allowance, and retains a bounded failed task for a recovery flow it owns. Node and browser are runtime alternatives. `entities` validate data at a boundary, `interfaces` define contracts, and the `keyed` and `retry` subpackages expose focused primitives rather than duplicate applications.

## Northstar Books examples

- **Resilience lifecycle hooks** solves the “a supplier fails repeatedly while a replenishment task needs deliberate recovery” problem. It observes a circuit opening, rejecting calls, closing after a successful probe, and draining failed work, proving that Northstar receives lifecycle evidence without changing primitive outcomes.
- **Sliding-window rate limiting** solves the “do not exceed a vendor’s rolling catalogue-query allowance” problem. It records admission and rejection in a rolling time window, proving that Northstar can select exact or bounded-space accounting for its own supplier rule.
- **Per-key token buckets with LRU eviction** solves the “one busy supplier account must not consume every catalogue-import slot” problem. It gives keys independent capacity and evicts inactive keys, proving that Northstar can bound the local registry while isolating demand.

## Public entrypoints

| Import path                              | Use it when                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@studnicky/resilience/node`             | Northstar applies core resilience primitives in a Node supplier or inventory service.                  |
| `@studnicky/resilience/browser`          | Northstar applies the browser-safe core primitives in a bookseller interface.                          |
| `@studnicky/resilience/entities`         | Northstar validates core limiter, breaker, queue, and event data at a boundary.                        |
| `@studnicky/resilience/interfaces`       | Northstar types its own clocks, classifiers, queue entries, and primitive collaborators.               |
| `@studnicky/resilience/keyed`            | Northstar gives each supplier account or tenant an independently bounded local rate-limiting strategy. |
| `@studnicky/resilience/keyed/entities`   | Northstar validates keyed-limiter configuration and state data.                                        |
| `@studnicky/resilience/keyed/interfaces` | Northstar implements a keyed rate-limiting strategy contract without coupling to a provider.           |
| `@studnicky/resilience/retry/node`       | Northstar executes a Node-side supplier operation under its chosen retry and backoff policy.           |
| `@studnicky/resilience/retry/browser`    | Northstar executes a browser-side operation under its chosen retry and backoff policy.                 |
| `@studnicky/resilience/retry/entities`   | Northstar validates retry data before a retry boundary consumes it.                                    |
| `@studnicky/resilience/retry/interfaces` | Northstar supplies retry configuration and collaborators through type contracts.                       |

## Exports

| Symbol                                             | Purpose                                                                                                           | Import path                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `CircuitBreaker`                                   | Three-state async circuit breaker.                                                                                | `@studnicky/resilience/node`             |
| `CircuitBreakerOpenError`                          | Signals a call rejected by an open circuit.                                                                       | `@studnicky/resilience/node`             |
| `CircuitBreakerCollaboratorsInterface`             | Typed clock and error-classifier collaborators `CircuitBreaker.create` accepts alongside schema-validated config. | `@studnicky/resilience/interfaces`       |
| `DeadLetterQueue<T>`                               | Bounded FIFO queue with async-generator drain.                                                                    | `@studnicky/resilience/node`             |
| `DeadLetterQueueAbortedError`                      | Signals enqueue after queue abort.                                                                                | `@studnicky/resilience/node`             |
| `DeadLetterQueueClosedError`                       | Signals enqueue after queue close.                                                                                | `@studnicky/resilience/node`             |
| `DeadLetterQueueFullError`                         | Signals enqueue at queue capacity.                                                                                | `@studnicky/resilience/node`             |
| `DeadLetterQueueOptionsInterface`                  | Caller-supplied queue options, including clock and abort signal.                                                  | `@studnicky/resilience/interfaces`       |
| `DeadLetterQueueRetryGenerator<T>`                 | Re-yields queue entries after a configurable pause.                                                               | `@studnicky/resilience/node`             |
| `DeadLetterQueueRetryGeneratorOptionsInterface<T>` | Caller-supplied retry-generator options with a live queue.                                                        | `@studnicky/resilience/interfaces`       |
| `ResilienceConfigError`                            | Signals invalid resilience configuration.                                                                         | `@studnicky/resilience/node`             |
| `Retry`                                            | Executes an operation under caller-supplied retry and backoff policy.                                             | `@studnicky/resilience/retry/node`       |
| `RetryConfigInterface`                             | Caller-supplied retry configuration and collaborators.                                                            | `@studnicky/resilience/retry/interfaces` |
| `ResilienceError`                                  | Base error for the package.                                                                                       | `@studnicky/resilience/node`             |
| `TokenBucket`                                      | Token-bucket rate limiter.                                                                                        | `@studnicky/resilience/node`             |
| `TokenBucketExhaustedError`                        | Signals insufficient available tokens.                                                                            | `@studnicky/resilience/node`             |
| `TokenBucketOptionsInterface`                      | Caller-supplied token-bucket options, including clock.                                                            | `@studnicky/resilience/interfaces`       |
| `SlidingWindowLimiter`                             | Enforces an exact or approximate sliding-window limit.                                                            | `@studnicky/resilience/node`             |
| `SlidingWindowExhaustedError`                      | Signals that a request exceeds available window capacity.                                                         | `@studnicky/resilience/node`             |
| `SlidingWindowLimiterConfigError`                  | Signals invalid sliding-window limiter configuration.                                                             | `@studnicky/resilience/node`             |
| `SlidingWindowLimiterError`                        | Base error for sliding-window limiter failures.                                                                   | `@studnicky/resilience/node`             |
| `SlidingWindowLimiterOptionsInterface`             | Caller-supplied sliding-window limiter options, including algorithm and clock.                                    | `@studnicky/resilience/interfaces`       |
| `KeyedRateLimiter`                                 | Per-key rate limiter with an injectable strategy.                                                                 | `@studnicky/resilience/keyed`            |
| `KeyedRateLimiterBoundaryError`                    | Signals invalid request, strategy, or strategy result boundaries.                                                 | `@studnicky/resilience/keyed`            |
| `KeyedRateLimiterConfigError`                      | Signals invalid keyed limiter configuration.                                                                      | `@studnicky/resilience/keyed`            |
| `KeyedRateLimiterError`                            | Base error for keyed limiter failures.                                                                            | `@studnicky/resilience/keyed`            |
| `RateLimiterStrategyInterface`                     | Structural strategy contract.                                                                                     | `@studnicky/resilience/keyed/interfaces` |
| `RateLimitConsumptionEntity`                       | Schema-derived admission result with `consumedTokens` and `remainingTokens`.                                      | `@studnicky/resilience/entities`         |
| `SlidingWindowLimiterOptionsEntity`                | Schema-derived sliding-window limiter options.                                                                    | `@studnicky/resilience/entities`         |

## Entities

`@studnicky/resilience/entities` exports all schema-backed configuration, state, event, and effect declarations. Each entity namespace provides `Schema`, `Type`, and `validate`.

<!-- inline-ts-ok: Documents the entities subpath import. -->

```typescript
import { CircuitBreakerOptionsEntity } from "@studnicky/resilience/entities";
```

## Interfaces

`@studnicky/resilience/interfaces` exports type-only event, effect, queue-entry, and option contracts.

<!-- inline-ts-ok: Documents the interfaces subpath import. -->

```typescript
import type { DeadLetterQueueEntryInterface } from "@studnicky/resilience/interfaces";
```

### `CircuitBreaker`

| Member      | Signature                                 | Description                                           |
| ----------- | ----------------------------------------- | ----------------------------------------------------- |
| `execute`   | `<T>(fn: () => Promise<T>) => Promise<T>` | Runs `fn`; throws `CircuitBreakerOpenError` when open |
| `state`     | `get state(): CircuitStateEntity.Type`    | Current circuit state                                 |
| `reset`     | `() => void`                              | Restores the closed state and clears failure counters |
| `forceOpen` | `() => void`                              | Forces circuit open                                   |

### `TokenBucket`

| Member         | Signature                                                                                           | Description                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `consume`      | `(tokens?: number) => RateLimitConsumptionEntity.Type`                                              | Consumes a positive finite token count and returns the admission; throws `TokenBucketExhaustedError` if insufficient |
| `waitForToken` | `(options?: { tokens?: number; signal?: AbortSignal }) => Promise<RateLimitConsumptionEntity.Type>` | Waits until a positive finite token count is available, then returns the admission                                   |
| `available`    | `number`                                                                                            | Current token count (triggers a refill calculation)                                                                  |

### `SlidingWindowLimiter`

| Member         | Signature                                                                                           | Description                                                       |
| -------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `consume`      | `(tokens?: number) => RateLimitConsumptionEntity.Type`                                              | Consumes a positive count when it fits within the rolling window. |
| `waitForToken` | `(options?: { tokens?: number; signal?: AbortSignal }) => Promise<RateLimitConsumptionEntity.Type>` | Waits until the requested count fits within the rolling window.   |

### `DeadLetterQueue<T>`

| Member    | Signature                                                | Description                                      |
| --------- | -------------------------------------------------------- | ------------------------------------------------ |
| `enqueue` | `(item, reason, error?) => void`                         | Adds item; throws on full, closed, or aborted    |
| `drain`   | `() => AsyncGenerator<DeadLetterQueueEntryInterface<T>>` | Yields all entries; suspends when queue is empty |
| `close`   | `() => void`                                             | Signals drain to stop after the current entries  |
| `abort`   | `() => void`                                             | Immediately stops drain                          |
| `size`    | `get size(): number`                                     | Current entry count                              |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/resilience)
