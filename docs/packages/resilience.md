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

```typescript
import { CircuitBreaker, CircuitBreakerOpenError } from '@studnicky/resilience';

const breaker = new CircuitBreaker({
  failureThreshold: 5,    // open after 5 consecutive failures
  resetTimeoutMs: 10_000, // probe after 10 s
  successThreshold: 2,    // close after 2 successes in half-open
  name: 'payment-api',
});

try {
  const result = await breaker.execute(() => callPaymentApi(request));
} catch (err) {
  if (err instanceof CircuitBreakerOpenError) {
    // Circuit is open — fast-fail without calling the remote
  }
}

breaker.state; // 'closed' | 'open' | 'halfOpen'
breaker.reset();       // force-close
breaker.forceOpen();   // force-open for testing
```

### TokenBucket

Leaky-bucket rate limiter; `consume` throws immediately when exhausted, `waitForToken` blocks until tokens refill.

```typescript
import { TokenBucket, TokenBucketExhaustedError } from '@studnicky/resilience';

const bucket = new TokenBucket({
  requestsPerSecond: 10,
  burstSize: 20, // allow bursts up to 20 tokens
});

// Non-blocking — throws when empty
try {
  bucket.consume();
  await sendRequest();
} catch (err) {
  if (err instanceof TokenBucketExhaustedError) {
    // Rate limit exceeded
  }
}

// Blocking — waits until a token is available
const controller = new AbortController();
await bucket.waitForToken(1, controller.signal);
await sendRequest();

bucket.available; // current token count
```

### DeadLetterQueue

Bounded FIFO queue for items that failed processing. Drain via async generator.

```typescript
import { DeadLetterQueue } from '@studnicky/resilience';

const dlq = new DeadLetterQueue<JobPayload>({ capacity: 1000 });

// Enqueue failed items
try {
  await processJob(job);
} catch (err) {
  dlq.enqueue(job, 'processing failed', err instanceof Error ? err : undefined);
}

// Drain asynchronously
for await (const entry of dlq.drain()) {
  console.log(entry.id, entry.reason, entry.enqueuedAtMs);
  await retryJob(entry.item);
}

dlq.close(); // drain loop will stop after current entries are consumed
```

### DeadLetterQueueRetryGenerator — timed re-delivery

```typescript
import { DeadLetterQueue, DeadLetterQueueRetryGenerator } from '@studnicky/resilience';

const dlq = new DeadLetterQueue<JobPayload>();
const retryGen = new DeadLetterQueueRetryGenerator(dlq, { intervalMs: 5_000 });

for await (const entry of retryGen.generate()) {
  await retryJob(entry.item); // each entry is yielded with a 5 s pause between
}
```

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
