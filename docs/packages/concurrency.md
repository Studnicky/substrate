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

## Usage

### Channel and Semaphore

Channel provides keyed producer/consumer buffering; Semaphore gates concurrent access to a shared resource with a counting permit:

<<< ../../packages/concurrency/examples/channelSemaphore.ts#usage

### Coalesce: deduplicate concurrent calls by key

All concurrent callers for the same key share a single in-flight promise; sequential callers each invoke the factory independently:

<<< ../../packages/concurrency/examples/coalesce.ts#usage

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
| `onSend` | Publish succeeds (channel open) | `key: string, item: T` |
| `onDequeue` | Item removed from buffer by subscriber | `key: string, item: T` |
| `onReceive` | Subscriber yields an item | `key: string, item: T` |
| `onPublishDropped` | Publish attempted on closed channel | `key: string, item: T` |
| `onClose` | Channel closes (all keys) | — |

### Coalesce hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onCoalesceStart` | Leader caller invokes the factory | `key: string` |
| `onCoalesceJoin` | Caller joined an in-flight call | `key: string` |
| `onCoalesceSettled` | In-flight promise settled | `key: string, success: boolean` |

<<< ../../packages/concurrency/examples/observedConcurrency.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## API

| Export | Type | Description |
|--------|------|-------------|
| `Channel<T>` | class | String-keyed fan-in async generator inbox |
| `Semaphore` | class | Counting permit gate with async acquire |
| `Coalesce<T>` | class | Deduplicates concurrent calls for the same key |
| `AsyncIter` | class | Static utilities for async iterables |

### `Channel<T>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `publish` | `(key: string, item: T) => void` | Sends item to subscribers on `key` |
| `subscribe` | `(key: string) => AsyncGenerator<T>` | Yields items published to `key` |
| `close` | `() => void` | Closes all channels; subscribers stop after draining |

### `Semaphore`

| Member | Signature | Description |
|--------|-----------|-------------|
| `acquire` | `() => Promise<() => void>` | Waits for a permit; returns a release function |
| `withPermit` | `<T>(callback: () => Promise<T>) => Promise<T>` | Acquires, runs callback, releases |
| `available` | `number` | Current available permit count |
| `permits` | `number` | Total configured permits |

### `Coalesce<T>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `run` | `(key: string, factory: () => Promise<T>) => Promise<T>` | Shares in-flight promise for `key` |
| `isInflight` | `(key: string) => boolean` | True if a promise for `key` is pending |

### `AsyncIter`

| Member | Signature | Description |
|--------|-----------|-------------|
| `merge` | `<T>(...sources) => AsyncGenerator<T>` | FIFO merge of N async iterables |
| `filter` | `<T>(source, predicate) => AsyncGenerator<T>` | Yields items matching sync/async predicate |
| `enrich` | `<T, E, R>(source, lookup, merge) => AsyncGenerator<T \| R>` | Left-join enrichment per item |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/concurrency)
