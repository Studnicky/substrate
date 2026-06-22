---
title: '@studnicky/concurrency'
description: Async concurrency primitives — channels, semaphores, coalescing, and iterable utilities.
---

# @studnicky/concurrency

> Keyed async channels, counting semaphores, concurrent-call coalescing, and async iterable combinators.

## Install

```bash
pnpm add @studnicky/concurrency
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

### Channel — keyed producer/consumer

```typescript
import { Channel } from '@studnicky/concurrency';

const channel = new Channel<string>();

// Producer
channel.publish('events', 'hello');
channel.publish('events', 'world');

// Consumer — async generator; one subscriber per key
for await (const message of channel.subscribe('events')) {
  console.log(message); // 'hello', 'world'
}

channel.close(); // signals all subscribers to stop
```

### Semaphore — counting permit gate

```typescript
import { Semaphore } from '@studnicky/concurrency';

const sem = new Semaphore(3); // max 3 concurrent operations

// Manual acquire/release
const release = await sem.acquire();
try {
  await doWork();
} finally {
  release();
}

// Convenience wrapper
await sem.withPermit(async () => {
  await doWork();
});

sem.available; // current permit count
sem.permits;   // total permit count
```

### Coalesce — deduplicate concurrent calls by key

```typescript
import { Coalesce } from '@studnicky/concurrency';

const coalesce = new Coalesce<UserRecord>();

// All concurrent calls for the same key share one in-flight promise
const user = await coalesce.run('user:42', () => fetchUser(42));

coalesce.isInflight('user:42'); // false — promise has resolved
```

### AsyncIter — merge, filter, enrich

```typescript
import { AsyncIter } from '@studnicky/concurrency';

// FIFO merge of multiple async generators in arrival order
const merged = AsyncIter.merge(streamA, streamB, streamC);
for await (const item of merged) { /* ... */ }

// Filter
const evens = AsyncIter.filter(numbers, (n) => n % 2 === 0);

// Left-join enrichment
const enriched = AsyncIter.enrich(
  records,
  async (record) => fetchMetadata(record.id), // returns null to skip
  (record, meta) => ({ ...record, ...meta })
);
```

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
