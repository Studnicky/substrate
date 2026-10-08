---
title: "@studnicky/concurrency"
description: "Async concurrency primitives: queues, channels, keyed and unkeyed semaphores, coalescing, keyed mutexes, iterable utilities, and finite batch processing."
---

# @studnicky/concurrency

> FIFO admission queues, keyed async channels, keyed permit pools, counting semaphores, keyed mutexes, concurrent-call coalescing, async iterable combinators, and finite batch processing.

## What it is

`@studnicky/concurrency` is a set of composable async coordination primitives: queues, channels, permits, keyed locks, single-flight work, async-iterable combinators, batches, and platform-native file locks. It supplies admission and ordering mechanics, not a bookstore job or workflow product.

## What it is for

Use it when Northstar Books needs bounded catalogue indexing, per-title mutual exclusion, duplicate-read coalescing, ordered work admission, or finite back-office processing. Consumers own domain keys, retry policy, persistence, and delivery semantics.

## Northstar Books examples

- **FIFO queue admission** maps catalogue-change intake to bounded ordered admission and proves backpressure remains visible to the consumer.
- **Batch fixed-window processing** maps a finite publisher-price import to fixed-size processing and proves ordered results can be collected.
- **Keyed mutex acquisition** maps concurrent updates to one ISBN to per-key mutual exclusion while unrelated titles continue.
- **Web Locks API mutual exclusion** maps a browser-held book-edit draft to the native Web Locks API and proves browser coordination stays runtime-specific.
- **Channel and Semaphore** maps stock-refresh work to buffered delivery and a shared execution limit.
- **Keyed semaphore** maps independently limited publisher feeds to per-key permit pools.
- **AsyncIter merge / filter / enrich** maps catalogue streams to merge, filter, and enrichment combinators without Node streams.

## Install

```bash
pnpm add @studnicky/concurrency
```

### Runtime imports

Node.js:

<!-- inline-ts-ok: Canonical published Node runtime import path; verified by check-docs-exports. -->

```typescript
import { Batch, KeyedSemaphore, Mutex, Semaphore } from "@studnicky/concurrency/node";
```

Browser:

<!-- inline-ts-ok: Canonical published browser runtime import path; verified by check-docs-exports. -->

```typescript
import { Batch, KeyedSemaphore, Mutex, Semaphore } from "@studnicky/concurrency/browser";
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

Runtime APIs have identical `@studnicky/concurrency/node` and `@studnicky/concurrency/browser` entry points. Choose the entry point for the consumer runtime; both export the same API.

## Usage

### Channel and Semaphore

Northstar's stock-refresh worker needs two different guarantees at once: deliveries should queue up safely even before anyone's listening, and only so many refresh jobs should run at the same time so the supplier API doesn't get hammered. `Channel` solves the first — it buffers published items per key so a late subscriber still receives everything in order — while `Semaphore` solves the second, capping concurrent work with a counting permit. The example below publishes numbers into a channel before anyone subscribes, keeps two independent keys from crossing streams, and then runs four competing tasks through a two-permit semaphore while watching `activeCount` and `available` move as permits are acquired, resized with `setPermits()`, and released.

<<< ../../packages/concurrency/examples/channelSemaphore.ts#usage

A semaphore accepts an optional queue cap. Pass `signal` to `acquire()` or `withPermit()` to cancel a wait or apply a deadline with `AbortSignal.timeout(...)`; Node and browser consumers use the same API.

### FIFO queue

When Northstar's catalogue-change feed fires faster than the indexer can keep up, the fix isn't to drop updates — it's to make the backlog visible and let the producer feel the slowdown. `BusQueue` is exactly that: a generic FIFO admission primitive that preserves delivery order, applies backpressure once a configured `highWaterMark` is reached, and accepts an `AbortSignal` for cancellation. The example enqueues three catalogue changes against a queue capped at two in flight, drains it, and confirms every item arrives in the order it was admitted.

<!-- inline-ts-ok: Canonical queue runtime import path; verified by check-docs-exports. -->

```typescript
import { BusQueue } from "@studnicky/concurrency/queue/node";
```

<<< ../../packages/concurrency/examples/queue.ts#usage

<RunnableExample src="packages/concurrency/examples/queue" title="FIFO queue admission" />

## Batch finite work

Northstar's nightly publisher-price import has a hard ceiling on how many requests can run at once, but it still needs every result accounted for in the original order. `Batch` processes a finite list in fixed-size windows — here, five prices doubled two at a time — yielding each window's results as it completes. The demo walks through `process()` collecting ordered, fulfilled batches and shows how the final flattened array still lines up with the input, regardless of which window a given price landed in.

<<< ../../packages/concurrency/examples/batch-basic-processing.ts#usage

<RunnableExample src="packages/concurrency/examples/batch-basic-processing" title="Batch fixed-window processing" />

### Compose bounded dispatch

Compose `Semaphore`, `EventBus`, and a scheduler directly when an application needs bounded execution, lifecycle events, and delayed work. The application owns its topic map and publication policy.

### Mutex

Two warehouse clerks editing the same ISBN's stock count at once is a recipe for a lost update — but blocking every unrelated title while they sort it out would be worse. `Mutex` serializes work per key: one holder at a time for `'resource'`, FIFO-ordered waiters, and every other key free to proceed untouched. The example below acquires the lock manually with a `try`/`finally` release, watches a second acquirer queue up behind it, and then shows the same guarantee through `acquireDisposable()`'s `await using`-friendly handle.

<<< ../../packages/concurrency/examples/mutex-acquire-release.ts#usage

<RunnableExample src="packages/concurrency/examples/mutex-acquire-release" title="Keyed mutex acquisition" />

### File lock

A bookseller editing a draft catalogue entry needs exclusive access to that one file, on whatever platform they're running — a Node import script or a browser tab. `FileLock` gives Node.js this guarantee through an atomic rename into an owner-qualified lock path, so only one process ever holds the file at a time. The example below acquires the lock, reads the original content, writes an update, reads it back, and releases — all inside a `try`/`finally` so the lock can't leak even if something goes wrong in between.

<!-- inline-ts-ok: Canonical file-lock runtime entry points; verified by check-docs-exports. -->

```typescript
import { FileLock } from "@studnicky/concurrency/file-lock/node";
import { WebLock } from "@studnicky/concurrency/file-lock/browser";
```

<<< ../../packages/concurrency/examples/file-lock-acquireRelease.ts#usage

<RunnableExample src="packages/concurrency/examples/file-lock-browserWebLock" title="Web Locks API mutual exclusion" />

FileLock coordinates participants that use the same path and lock protocol; it does not replace a database or distributed-locking policy. A held lock exposes synchronous `read()`, `write()`, and idempotent `release()`. `FileLock.create()` also supports `using` disposal.

### KeyedSemaphore

Northstar pulls stock updates from several publisher feeds in parallel, but each publisher's own API can only take one request at a time — hammer it from two directions and you'll get throttled. `KeyedSemaphore` hands out a completely independent permit pool per key, so `account:a` and `account:b` can both be active at once while a second request for `account:a` queues up and waits its turn. The example proves the isolation: two keys acquire simultaneously, a third request for an already-busy key is forced to wait, and once everything releases, every key's bookkeeping drops back to zero.

<<< ../../packages/concurrency/examples/keyedSemaphore.ts#usage

### Coalesce: deduplicate concurrent calls by key

When three parts of the storefront ask for the same book's price at the same moment, there's no reason to hit the pricing API three times — the first caller's answer is good enough for all of them. `Coalesce` deduplicates concurrent calls by key: whoever arrives first starts the factory, and every other caller for that key simply waits on the same promise instead of starting their own. The example confirms the sharing with a call counter that stays at one for concurrent callers, checks `isInflight()` before, during, and after the call, and then shows that calls which don't overlap in time each pay for their own factory invocation.

<<< ../../packages/concurrency/examples/coalesce.ts#usage

`Coalesce` reserves and publishes the shared completion before it awaits `onCoalesceStart` or invokes the factory. Reentrant or concurrent callers for that key therefore join the same promise during either stage. A rejection from `onCoalesceStart` or the factory rejects that shared promise for the leader and every joiner, and the entry is removed after settlement.

#### Timeout: `CoalesceTimeoutError`

A `timeout` option caps how long an individual caller waits on the shared in-flight promise. When a caller's timeout elapses, only that caller's `run()` rejects with `CoalesceTimeoutError` — the in-flight entry is left untouched for other callers still waiting on it:

<!-- inline-ts-ok: conceptual error-handling illustration for CoalesceTimeoutError; no in-repo example file exercises the timeout/rejection path -->

```typescript
import { Coalesce, CoalesceTimeoutError } from "@studnicky/concurrency/node";

const coalesce = Coalesce.create<Response>({ timeout: 5000 });

try {
  await coalesce.run("user:42", () => fetch("/api/user/42"));
} catch (error) {
  if (error instanceof CoalesceTimeoutError) {
    console.log(error.key); // 'user:42'
    console.log(error.timeoutMs); // 5000
  }
}
```

### AsyncIter: merge, filter, enrich

Northstar's catalogue has several independent streams of change events — new titles, price updates, inventory ticks — and combining them without pulling in Node's stream machinery keeps the logic portable to the browser too. `AsyncIter` works directly against plain `async function*` generators: `merge` interleaves multiple sources in arrival order, `filter` keeps only the values a predicate accepts (sync or async), and `enrich` left-joins extra data onto matching items while passing the rest through untouched. The example chains all three — merging two numeric ranges, filtering down to multiples of three, and tagging only the larger survivors with a `tier` label — to show the combinators composing into one pipeline.

<<< ../../packages/concurrency/examples/asyncIter.ts#usage

## Observability hooks

Watching what a `Semaphore`, `Channel`, or `Coalesce` instance is actually doing shouldn't require rewriting its logic — each class exposes protected hook methods built for exactly that, fired at every meaningful lifecycle event. Subclass any of them, override the hooks that matter, and the base class keeps working exactly as before while your overrides collect whatever trace or metric Northstar needs.

### Semaphore hooks

| Hook                 | When it fires                                | Args                    |
| -------------------- | -------------------------------------------- | ----------------------- |
| `onAcquire`          | Permit granted immediately                   | `permitsBefore: number` |
| `onAcquireWait`      | Caller queued (no permit available)          | —                       |
| `onContended`        | New waiter added to queue                    | `queueLength: number`   |
| `onRelease`          | Permit returned to pool (no waiting callers) | `permitsAfter: number`  |
| `onReleaseDelegated` | Permit handed to queued waiter               | —                       |

### Channel hooks

| Hook               | When it fires                                                 | Args                         |
| ------------------ | ------------------------------------------------------------- | ---------------------------- |
| `onEnqueue`        | Item added to buffer                                          | `key: string, item: T`       |
| `onDequeue`        | Item removed from buffer by subscriber                        | `key: string, item: T`       |
| `onPublishDropped` | Publish attempted on closed channel                           | `key: string, item: T`       |
| `onClose`          | Channel closes (all keys)                                     | —                            |
| `onOverflow`       | Configured `highWaterMark` is reached after an item is staged | `key: string, depth: number` |

### Batch hooks

| Hook                     | When it fires                                                | Args                              |
| ------------------------ | ------------------------------------------------------------ | --------------------------------- |
| `onBatchStart`           | A non-empty operation starts.                                | `total: number`                   |
| `onConcurrencySaturated` | A fixed-size window is full.                                 | —                                 |
| `onItemStart`            | An item operation starts.                                    | `index: number`                   |
| `onItemSuccess`          | An item operation fulfills.                                  | `index: number, result: TResult`  |
| `onItemError`            | An item operation rejects.                                   | `index: number, error: BaseError` |
| `onItemSettled`          | An item operation settles.                                   | `index: number`                   |
| `onBatchComplete`        | All items settle successfully or through `processSettled()`. | `stats: BatchStatsEntity.Type`    |

### Mutex hooks

| Hook            | When it fires                              | Args                         |
| --------------- | ------------------------------------------ | ---------------------------- |
| `beforeAcquire` | Before each acquisition attempt.           | `key: K`                     |
| `afterAcquire`  | A lock is granted.                         | `key: K, waitTimeMs: number` |
| `onContended`   | An acquisition queues behind a holder.     | `key: K, queueSize: number`  |
| `onAcquireWait` | A queued acquisition is granted.           | `key: K, waitTimeMs: number` |
| `beforeRelease` | Before a holder releases.                  | `key: K, holdTimeMs: number` |
| `afterRelease`  | After release processing completes.        | `key: K`                     |
| `onRelease`     | Every holder release completes.            | `key: K`                     |
| `onQueueDrain`  | The final waiter leaves a key queue.       | `key: K`                     |
| `onTimeout`     | A queued acquisition reaches its deadline. | `key: K, timeoutMs: number`  |

### Coalesce hooks

| Hook                | When it fires                                                                               | Args                             |
| ------------------- | ------------------------------------------------------------------------------------------- | -------------------------------- |
| `onCoalesceStart`   | After the shared completion is reserved and before the leader invokes the factory           | `key: string`                    |
| `onCoalesceJoin`    | Caller joined an in-flight call                                                             | `key: string`                    |
| `onCoalesceSettled` | In-flight promise settled                                                                   | `key: string, success: boolean`  |
| `onTimeout`         | One caller exceeds its configured wait timeout without disturbing the shared in-flight call | `key: string, timeoutMs: number` |

<<< ../../packages/concurrency/examples/observedConcurrency.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Try it

This demo builds a `Semaphore` and a `Channel` directly with `create(...)` and puts both through their paces live. Watch the semaphore cap four competing tasks down to two running at once no matter how they race to start, and watch the channel hand back everything it buffered in exactly the order it was published, even across multiple keys and a concurrent subscriber.

<RunnableExample src="packages/concurrency/examples/channelSemaphore" title="Channel and Semaphore" />

<RunnableExample src="packages/concurrency/examples/keyedSemaphore" title="Keyed semaphore" />

This demo feeds two independent `async function*` ranges — no Node.js streams involved — straight into `AsyncIter.merge`, `AsyncIter.filter`, and `AsyncIter.enrich`. Watch the merge interleave values from both ranges as they arrive, the filter narrow a 1–10 range down to just the evens, and the final composed pipeline keep only the multiples of three while tagging anything above five with a `tier: 'high'` enrichment.

<RunnableExample src="packages/concurrency/examples/asyncIter" title="AsyncIter merge / filter / enrich" />

## Public entrypoints

| Import path                                   | Use it when                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `@studnicky/concurrency/node`                 | A server or worker needs general runtime coordination primitives.                               |
| `@studnicky/concurrency/browser`              | A browser bundle needs the same general primitives; it is the runtime alternative to `/node`.   |
| `@studnicky/concurrency/entities`             | A consumer needs shared coordination schemas as contracts.                                      |
| `@studnicky/concurrency/interfaces`           | A consumer needs shared coordination interfaces as contracts.                                   |
| `@studnicky/concurrency/queue/node`           | A server needs FIFO admission for catalogue work.                                               |
| `@studnicky/concurrency/queue/browser`        | A browser needs the same queue primitive; it is the runtime alternative to `/queue/node`.       |
| `@studnicky/concurrency/queue/entities`       | A consumer needs queue state and option schemas as contracts.                                   |
| `@studnicky/concurrency/queue/interfaces`     | A consumer needs queue construction contracts.                                                  |
| `@studnicky/concurrency/mutex`                | An ISBN or order key needs FIFO mutual exclusion.                                               |
| `@studnicky/concurrency/file-lock/node`       | A Node process needs file-based exclusive coordination.                                         |
| `@studnicky/concurrency/file-lock/browser`    | A browser needs native Web Locks; it is the runtime alternative to `/file-lock/node`.           |
| `@studnicky/concurrency/file-lock/entities`   | A consumer needs file-lock schemas as contracts.                                                |
| `@studnicky/concurrency/file-lock/interfaces` | A consumer needs file-lock ports as contracts.                                                  |
| `@studnicky/concurrency/batch`                | A finite import needs bounded windowed processing.                                              |
| `@studnicky/concurrency/throttle/node`        | A server needs adaptive or fixed concurrency limiting with drain and abort control.             |
| `@studnicky/concurrency/throttle/browser`     | A browser needs the same throttle primitive; it is the runtime alternative to `/throttle/node`. |
| `@studnicky/concurrency/throttle/entities`    | A consumer needs throttle configuration and stats schemas as contracts.                         |
| `@studnicky/concurrency/throttle/interfaces`  | A consumer needs throttle construction and event contracts.                                     |

## Exports

| Symbol                                 | Purpose                                                                                                     | Import path                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `AsyncIter`                            | Static combinators for async iterables.                                                                     | `@studnicky/concurrency/node`                                   |
| `Batch`                                | Fixed-window and immediate-refill processing for finite inputs.                                             | `@studnicky/concurrency/batch`<br>`@studnicky/concurrency/node` |
| `BatchError`                           | Signals invalid Batch construction.                                                                         | `@studnicky/concurrency/node`                                   |
| `BusQueue`                             | Generic FIFO admission and ordered delivery with backpressure.                                              | `@studnicky/concurrency/queue/node`                             |
| `BusQueueConfigError`                  | Signals invalid queue construction.                                                                         | `@studnicky/concurrency/queue/node`                             |
| `BusQueueCreateOptionsInterface`       | Queue construction contract.                                                                                | `@studnicky/concurrency/queue/interfaces`                       |
| `BusQueueAbortedStateEntity`           | Terminal queue lifecycle state.                                                                             | `@studnicky/concurrency/queue/entities`                         |
| `BusQueueAbortEventEntity`             | Queue abort lifecycle event.                                                                                | `@studnicky/concurrency/queue/entities`                         |
| `BusQueueAbortingStateEntity`          | Queue abort-in-progress lifecycle state.                                                                    | `@studnicky/concurrency/queue/entities`                         |
| `BusQueueCreateOptionsEntity`          | Schema-backed queue construction options.                                                                   | `@studnicky/concurrency/queue/entities`                         |
| `BusQueueDrainingStateEntity`          | Queue drain lifecycle state.                                                                                | `@studnicky/concurrency/queue/entities`                         |
| `BusQueueLoopFinishedEventEntity`      | Queue loop-finished lifecycle event.                                                                        | `@studnicky/concurrency/queue/entities`                         |
| `BusQueueOpenStateEntity`              | Queue open lifecycle state.                                                                                 | `@studnicky/concurrency/queue/entities`                         |
| `BusQueueOptionsEntity`                | Schema-backed serializable queue options.                                                                   | `@studnicky/concurrency/queue/entities`                         |
| `BusQueueReleaseForAbortEffectEntity`  | Queue abort release effect.                                                                                 | `@studnicky/concurrency/queue/entities`                         |
| `BusQueueStartLoopEventEntity`         | Queue loop-start lifecycle event.                                                                           | `@studnicky/concurrency/queue/entities`                         |
| `Channel`                              | String-keyed fan-in async-generator inbox.                                                                  | `@studnicky/concurrency/node`                                   |
| `ChannelError`                         | Base error for channel operations.                                                                          | `@studnicky/concurrency/node`                                   |
| `Coalesce`                             | Deduplicates concurrent calls by key.                                                                       | `@studnicky/concurrency/node`                                   |
| `CoalesceTimeoutError`                 | Signals a caller timeout while a coalesced operation remains in flight.                                     | `@studnicky/concurrency/node`                                   |
| `CoalesceWaitCompletedError`           | Abort reason for a caller's cancelled timeout timer once its wait on the shared in-flight promise finishes. | `@studnicky/concurrency/node`                                   |
| `ConcurrencyError`                     | Base error for the package.                                                                                 | `@studnicky/concurrency/node`                                   |
| `LockTimeoutError`                     | Signals a queued mutex acquisition deadline.                                                                | `@studnicky/concurrency/node`                                   |
| `Mutex`                                | FIFO keyed mutual exclusion with queue caps, deadlines, disposable handles, and lifecycle hooks.            | `@studnicky/concurrency/mutex`<br>`@studnicky/concurrency/node` |
| `MutexError`                           | Base error for mutex operations.                                                                            | `@studnicky/concurrency/node`                                   |
| `FileLock`                             | Atomic-rename, single-writer lock for a Node.js file.                                                       | `@studnicky/concurrency/file-lock/node`                         |
| `FileLockConfigError`                  | Signals invalid file-lock configuration.                                                                    | `@studnicky/concurrency/file-lock/node`                         |
| `FileLockContentionError`              | Signals an unsuccessful atomic rename acquisition.                                                          | `@studnicky/concurrency/file-lock/node`                         |
| `FileLockError`                        | Base error for file-lock operations.                                                                        | `@studnicky/concurrency/file-lock/node`                         |
| `FileLockFileSystemError`              | Signals an underlying filesystem failure.                                                                   | `@studnicky/concurrency/file-lock/node`                         |
| `FileLockInspection`                   | Inspects owner-qualified lock paths.                                                                        | `@studnicky/concurrency/file-lock/node`                         |
| `FileLockLivenessError`                | Signals an owner-liveness query failure.                                                                    | `@studnicky/concurrency/file-lock/node`                         |
| `FileLockWebLockError`                 | Signals a native Web Locks API request failure.                                                             | `@studnicky/concurrency/file-lock/browser`                      |
| `FileLockRecovery`                     | Restores an explicitly inspected lock path.                                                                 | `@studnicky/concurrency/file-lock/node`                         |
| `FileLockRecoveryConflictError`        | Signals recovery blocked by an occupied original path.                                                      | `@studnicky/concurrency/file-lock/node`                         |
| `FileLockTimeoutError`                 | Signals acquisition past its deadline.                                                                      | `@studnicky/concurrency/file-lock/node`                         |
| `FileRenameLock`                       | Atomic rename acquisition and release primitive.                                                            | `@studnicky/concurrency/file-lock/node`                         |
| `NodeOwnerLiveness`                    | Checks a Node process owner's liveness.                                                                     | `@studnicky/concurrency/file-lock/node`                         |
| `WebLock`                              | Native browser Web Locks API adapter.                                                                       | `@studnicky/concurrency/file-lock/browser`                      |
| `FileLockAcquiredEventEntity`          | File-lock acquisition transition event.                                                                     | `@studnicky/concurrency/file-lock/entities`                     |
| `FileLockInspectionEntity`             | Inspected owner-qualified lock-path record.                                                                 | `@studnicky/concurrency/file-lock/entities`                     |
| `FileLockOptionsEntity`                | Validates Node file-lock options.                                                                           | `@studnicky/concurrency/file-lock/entities`                     |
| `FileLockPathStateEntity`              | Canonical original and held lock paths.                                                                     | `@studnicky/concurrency/file-lock/entities`                     |
| `FileLockReleasedEventEntity`          | File-lock release transition event.                                                                         | `@studnicky/concurrency/file-lock/entities`                     |
| `FileLockStateEntity`                  | File-lock lifecycle state.                                                                                  | `@studnicky/concurrency/file-lock/entities`                     |
| `WebLockOptionsEntity`                 | Validates browser Web Lock options.                                                                         | `@studnicky/concurrency/file-lock/entities`                     |
| `FileLockCreateOptionsInterface`       | Node file-lock construction contract.                                                                       | `@studnicky/concurrency/file-lock/interfaces`                   |
| `FileLockInspectionOptionsInterface`   | Lock inspection contract.                                                                                   | `@studnicky/concurrency/file-lock/interfaces`                   |
| `FileLockRecoveryOptionsInterface`     | Explicit recovery contract.                                                                                 | `@studnicky/concurrency/file-lock/interfaces`                   |
| `FileRenameLockCreateOptionsInterface` | Atomic rename-lock construction contract.                                                                   | `@studnicky/concurrency/file-lock/interfaces`                   |
| `LockInterface`                        | Shared idempotent release contract.                                                                         | `@studnicky/concurrency/file-lock/interfaces`                   |
| `OwnerLivenessInterface`               | Owner liveness abstraction.                                                                                 | `@studnicky/concurrency/file-lock/interfaces`                   |
| `OwnerTokenInterface`                  | Owner token abstraction.                                                                                    | `@studnicky/concurrency/file-lock/interfaces`                   |
| `WebLockCreateOptionsInterface`        | Native Web Lock construction contract.                                                                      | `@studnicky/concurrency/file-lock/interfaces`                   |
| `WebLockManagerInterface`              | Native Web Locks manager dependency contract.                                                               | `@studnicky/concurrency/file-lock/interfaces`                   |
| `QueueSizeExceededError`               | Signals that a keyed mutex queue has reached its configured capacity.                                       | `@studnicky/concurrency/node`                                   |
| `Semaphore`                            | Counting permit gate for asynchronous work.                                                                 | `@studnicky/concurrency/node`                                   |
| `KeyedSemaphore`                       | Independent per-key permit gates.                                                                           | `@studnicky/concurrency/node`                                   |
| `SemaphoreQueueFullError`              | Signals that a bounded semaphore queue is full.                                                             | `@studnicky/concurrency/node`                                   |
| `SemaphoreError`                       | Base error for semaphore operations.                                                                        | `@studnicky/concurrency/node`                                   |

## Entities

`@studnicky/concurrency/entities` exports all schema-backed option, state, transition, and event declarations. Each entity namespace provides `Schema`, `Type`, and `validate`.

<!-- inline-ts-ok: Documents the entities subpath import. -->

```typescript
import {
  BatchStatsEntity,
  ChannelKeyStateEntity,
  SemaphoreOptionsEntity,
} from "@studnicky/concurrency/entities";
```

## Interfaces

`@studnicky/concurrency/interfaces` exports runtime-only contracts that compose platform values rather than serializable schema fields.

<!-- inline-ts-ok: Documents the interfaces subpath import. -->

```typescript
import type { SemaphoreAcquireOptionsInterface } from "@studnicky/concurrency/interfaces";
```

### `Batch<TResult>`

| Member                     | Signature                                                                  | Description                                                      |
| -------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `create`                   | `static create<TResult>(maximumConcurrent?: number) => Batch<TResult>`     | Constructs a Batch with a positive integer window size.          |
| `process`                  | `<T>(items, operation) => AsyncGenerator<TResult[]>`                       | Processes fixed windows and yields each fulfilled result window. |
| `processSettled`           | `<T>(items, operation) => AsyncGenerator<PromiseSettledResult<TResult>[]>` | Processes fixed windows and yields every settlement.             |
| `processContinuous`        | `<T>(items, operation) => Promise<TResult[]>`                              | Immediately refills capacity and rejects on the first failure.   |
| `processContinuousSettled` | `<T>(items, operation) => Promise<PromiseSettledResult<TResult>[]>`        | Immediately refills capacity and returns every settlement.       |

### `Channel<T>`

| Member      | Signature                                                             | Description                                              |
| ----------- | --------------------------------------------------------------------- | -------------------------------------------------------- |
| `create`    | `static create<T>(options?: ChannelOptionsEntity.Type) => Channel<T>` | Constructs a channel from optional configuration         |
| `publish`   | `(key: string, item: T) => Promise<void>`                             | Sends an item to `key` and completes its admission hooks |
| `subscribe` | `(key: string) => AsyncGenerator<T>`                                  | Yields items published to `key`                          |
| `close`     | `() => Promise<void>`                                                 | Closes all channels; subscribers stop after draining     |

### `Semaphore`

| Member             | Signature                                                                      | Description                                                                     |
| ------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `create`           | `static create(options: SemaphoreOptionsEntity.Type) => Semaphore`             | Constructs a semaphore with the required permit count                           |
| `acquire`          | `(options?: SemaphoreAcquireOptionsInterface) => Promise<() => Promise<void>>` | Waits for a permit; `signal` cancels or bounds the wait                         |
| `withPermit`       | `<T>(callback: () => Promise<T>) => Promise<T>`                                | Acquires, runs callback, releases                                               |
| `setPermits`       | `(permits: number) => Promise<void>`                                           | Changes capacity; work already holding permits continues                        |
| `waitForIdle`      | `() => Promise<void>`                                                          | Resolves when no work is active or queued                                       |
| `activeCount`      | `number`                                                                       | Current holders                                                                 |
| `maximumQueueSize` | `number`                                                                       | Waiting capacity; `0` means unlimited                                           |
| `available`        | `number`                                                                       | Current available permit count; may be negative while a reduced capacity drains |
| `queuedCount`      | `number`                                                                       | Current waiting acquirers                                                       |
| `permits`          | `number`                                                                       | Total configured permits                                                        |

### `Mutex<K>`

| Member                          | Signature                                                             | Description                                                   |
| ------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| `create`                        | `static create<K>(options?: MutexCreateOptionsInterface) => Mutex<K>` | Constructs a keyed mutex.                                     |
| `acquire`                       | `(key: K) => Promise<() => void>`                                     | Waits for the key and returns an idempotent release function. |
| `acquireDisposable`             | `(key: K) => Promise<MutexLockInterface>`                             | Returns an `await using` compatible lock handle.              |
| `runExclusive`                  | `(key: K, callback) => Promise<unknown>`                              | Runs one callback at a time for the key.                      |
| `queueSize`, `isLocked`, `size` | `(key?: K) => number \| boolean`                                      | Inspects admission and active locks.                          |
| `completeQueue`                 | `() => Promise<void>`                                                 | Resolves when all held and queued work drains.                |
| `clear`                         | `() => void`                                                          | Rejects queued acquirers and clears active state.             |

### `KeyedSemaphore<K>`

| Member                       | Signature                                                                                           | Description                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `create`                     | `static create<K>(options: SemaphoreOptionsEntity.Type) => KeyedSemaphore<K>`                       | Constructs one permit policy per key   |
| `acquire`                    | `(key: K, options?: SemaphoreAcquireOptionsInterface) => Promise<() => Promise<void>>`              | Acquires a permit for `key`            |
| `withPermit`                 | `<T>(key: K, callback: () => Promise<T>, options?: SemaphoreAcquireOptionsInterface) => Promise<T>` | Runs work within `key`’s permit limit  |
| `waitForIdle`                | `(key?: K) => Promise<void>`                                                                        | Waits for one key or all keys to drain |
| `activeCount`, `queuedCount` | `(key?: K) => number`                                                                               | Reads per-key or aggregate load        |

### `Coalesce<T>`

| Member       | Signature                                                               | Description                                                |
| ------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| `create`     | `static create<T>(options?: CoalesceOptionsEntity.Type) => Coalesce<T>` | Constructs a coalescer from optional timeout configuration |
| `run`        | `(key: string, factory: () => Promise<T>) => Promise<T>`                | Shares in-flight promise for `key`                         |
| `isInflight` | `(key: string) => boolean`                                              | True if a promise for `key` is pending                     |

### `AsyncIter`

| Member   | Signature                                                    | Description                                |
| -------- | ------------------------------------------------------------ | ------------------------------------------ |
| `merge`  | `<T>(...sources) => AsyncGenerator<T>`                       | FIFO merge of N async iterables            |
| `filter` | `<T>(source, predicate) => AsyncGenerator<T>`                | Yields items matching sync/async predicate |
| `enrich` | `<T, E, R>(source, lookup, merge) => AsyncGenerator<T \| R>` | Left-join enrichment per item              |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/concurrency)
