---
title: '@studnicky/concurrency'
description: "Async concurrency primitives: channels, semaphores, coalescing, and iterable utilities."
---

# @studnicky/concurrency

> Keyed async channels, counting semaphores, concurrent-call coalescing, and async iterable combinators.

## Install

```bash
pnpm add @studnicky/concurrency
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

The package declares runtime dependencies on `@studnicky/circular-buffer`, `@studnicky/errors`, `@studnicky/json`, `ajv`, and `json-schema-to-ts`.

## Usage

### Channel and Semaphore

Channel provides keyed producer/consumer buffering; Semaphore gates concurrent access to a shared resource with a counting permit:

<<< ../../packages/concurrency/examples/channelSemaphore.ts#usage

### Coalesce: deduplicate concurrent calls by key

All concurrent callers for the same key share a single in-flight promise; sequential callers each invoke the factory independently:

<<< ../../packages/concurrency/examples/coalesce.ts#usage

`Coalesce` reserves and publishes the shared completion before it awaits `onCoalesceStart` or invokes the factory. Reentrant or concurrent callers for that key therefore join the same promise during either stage. A rejection from `onCoalesceStart` or the factory rejects that shared promise for the leader and every joiner, and the entry is removed after settlement.

#### Timeout: `CoalesceTimeoutError`

A `timeout` option caps how long an individual caller waits on the shared in-flight promise. When a caller's timeout elapses, only that caller's `run()` rejects with `CoalesceTimeoutError` — the in-flight entry is left untouched for other callers still waiting on it:

<!-- inline-ts-ok: conceptual error-handling illustration for CoalesceTimeoutError; no in-repo example file exercises the timeout/rejection path -->
```typescript
import { Coalesce, CoalesceTimeoutError } from '@studnicky/concurrency';

const coalesce = Coalesce.create<Response>({ timeout: 5000 });

try {
  await coalesce.run('user:42', () => fetch('/api/user/42'));
} catch (error) {
  if (error instanceof CoalesceTimeoutError) {
    console.log(error.key);        // 'user:42'
    console.log(error.timeoutMs);  // 5000
  }
}
```

### AsyncIter: merge, filter, enrich

Compose async iterables with FIFO merge, sync/async predicate filter, and left-join enrichment:

<<< ../../packages/concurrency/examples/asyncIter.ts#usage

## Observability hooks

Each class exposes protected hook methods you can override in a subclass to observe
internal lifecycle events without modifying the class logic.

### Semaphore hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onAcquire` | Permit granted immediately | `permitsBefore: number` |
| `onAcquireWait` | Caller queued (no permit available) | — |
| `onContended` | New waiter added to queue | `queueLength: number` |
| `onRelease` | Permit returned to pool (no waiting callers) | `permitsAfter: number` |
| `onReleaseDelegated` | Permit handed to queued waiter | — |

### Channel hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onEnqueue` | Item added to buffer | `key: string, item: T` |
| `onDequeue` | Item removed from buffer by subscriber | `key: string, item: T` |
| `onPublishDropped` | Publish attempted on closed channel | `key: string, item: T` |
| `onClose` | Channel closes (all keys) | — |
| `onOverflow` | Configured `highWaterMark` is reached after an item is staged | `key: string, depth: number` |

### Coalesce hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onCoalesceStart` | After the shared completion is reserved and before the leader invokes the factory | `key: string` |
| `onCoalesceJoin` | Caller joined an in-flight call | `key: string` |
| `onCoalesceSettled` | In-flight promise settled | `key: string, success: boolean` |
| `onTimeout` | One caller exceeds its configured wait timeout without disturbing the shared in-flight call | `key: string, timeoutMs: number` |

<<< ../../packages/concurrency/examples/observedConcurrency.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Try it

The channel-and-semaphore demo constructs both primitives directly with `create(...)`. Watch the Semaphore limit concurrent executions to two at a time across four competing tasks, then watch the Channel deliver buffered items in publish order.

<RunnableExample src="packages/concurrency/examples/channelSemaphore" title="Channel and Semaphore" />

The async-iter demo uses native `async function*` generators as sources — no Node.js streams — and passes them through `AsyncIter.merge`, `AsyncIter.filter`, and `AsyncIter.enrich`. Watch the merged output interleave values from two independent ranges, the filter keep only even numbers, and the final composed pipeline emit only the multiples-of-three with a `tier` enrichment applied to values above five.

<RunnableExample src="packages/concurrency/examples/asyncIter" title="AsyncIter merge / filter / enrich" />

## API

| Export | Type | Description |
|--------|------|-------------|
| `Channel<T>` | class | String-keyed fan-in async generator inbox |
| `Semaphore` | class | Counting permit gate with async acquire |
| `Coalesce<T>` | class | Deduplicates concurrent calls for the same key |
| `AsyncIter` | class | Static utilities for async iterables |
| `ChannelOptionsEntity`, `CoalesceOptionsEntity`, `SemaphoreOptionsEntity` | entities | Schema-backed construction data |
| `ChannelError`, `CoalesceTimeoutError`, `ConcurrencyError`, `SemaphoreError` | errors | Concurrency-specific failures |

### `Channel<T>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create<T>(options?: ChannelOptionsEntity.Type) => Channel<T>` | Constructs a channel from optional configuration |
| `publish` | `(key: string, item: T) => Promise<void>` | Sends an item to `key` and completes its admission hooks |
| `subscribe` | `(key: string) => AsyncGenerator<T>` | Yields items published to `key` |
| `close` | `() => Promise<void>` | Closes all channels; subscribers stop after draining |

### `Semaphore`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create(options: SemaphoreOptionsEntity.Type) => Semaphore` | Constructs a semaphore with the required permit count |
| `acquire` | `() => Promise<() => Promise<void>>` | Waits for a permit; returns an asynchronous release function |
| `withPermit` | `<T>(callback: () => Promise<T>) => Promise<T>` | Acquires, runs callback, releases |
| `available` | `number` | Current available permit count |
| `permits` | `number` | Total configured permits |

### `Coalesce<T>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create<T>(options?: CoalesceOptionsEntity.Type) => Coalesce<T>` | Constructs a coalescer from optional timeout configuration |
| `run` | `(key: string, factory: () => Promise<T>) => Promise<T>` | Shares in-flight promise for `key` |
| `isInflight` | `(key: string) => boolean` | True if a promise for `key` is pending |

### `AsyncIter`

| Member | Signature | Description |
|--------|-----------|-------------|
| `merge` | `<T>(...sources) => AsyncGenerator<T>` | FIFO merge of N async iterables |
| `filter` | `<T>(source, predicate) => AsyncGenerator<T>` | Yields items matching sync/async predicate |
| `enrich` | `<T, E, R>(source, lookup, merge) => AsyncGenerator<T \| R>` | Left-join enrichment per item |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/concurrency)
