# @studnicky/concurrency

> Keyed async channels, keyed permit pools, counting semaphores, concurrent-call coalescing, and async iterable combinators.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/concurrency)

`@studnicky/concurrency` provides five building blocks for async coordination in Node.js and browser runtimes. `Channel` is a string-keyed fan-in inbox where producers publish items and consumers iterate them as async generators. `Semaphore` is a counting permit gate that bounds how many concurrent operations run at once. `KeyedSemaphore` applies that same policy independently to each resource key. `Coalesce` deduplicates concurrent calls by key so that a shared factory runs exactly once per in-flight batch. `AsyncIter` supplies static combinators — `merge`, `filter`, and `enrich` — for composing async iterables.

Use `@studnicky/concurrency/node` in Node.js and `@studnicky/concurrency/browser` in browser bundles. Both runtime entry points export the same API. Schema-backed data declarations are available from `@studnicky/concurrency/entities`; type-only internal coordination contracts are available from `@studnicky/concurrency/interfaces`.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/concurrency
```

### Runtime imports

Node.js:

```typescript
import { KeyedSemaphore, Semaphore } from '@studnicky/concurrency/node';
```

Browser:

```typescript
import { KeyedSemaphore, Semaphore } from '@studnicky/concurrency/browser';
```

## Usage

```typescript
import { AsyncIter, Channel, Coalesce, KeyedSemaphore, Semaphore } from '@studnicky/concurrency/node';

// Channel — keyed producer / consumer
const channel = Channel.create<string>();
channel.publish('events', 'hello');
channel.publish('events', 'world');
channel.close();
const received: string[] = [];
for await (const msg of channel.subscribe('events')) {
  received.push(msg);
}
// received === ['hello', 'world']

// Channel — observing a slow consumer via highWaterMark
const boundedChannel = Channel.create<string>({ highWaterMark: 100 });
// override onOverflow(key, depth) in a subclass to observe a per-key buffer
// growing past 100 items; publish() still accepts every item — nothing is dropped

// Semaphore — bound concurrency
const sem = Semaphore.create({ permits: 2 });
const result = await sem.withPermit(async () => {
  // at most 2 callers reach here simultaneously
  return fetch('https://api.example.com/data');
});
console.log(sem.available); // 2 — permit returned

// A bounded queue refuses excess waiting work. Compose an acquisition deadline
// with an AbortSignal; the same call works in Node and browsers.
const bounded = Semaphore.create({ maximumQueueSize: 100, permits: 2 });
await bounded.withPermit(async () => fetch('https://api.example.com/data'), {
  signal: AbortSignal.timeout(5_000),
});

// Capacity can change without interrupting work that already holds a permit.
await sem.setPermits(4);
await sem.waitForIdle();
console.log(sem.activeCount, sem.queuedCount); // 0, 0

// KeyedSemaphore gives each key independent capacity and queue space.
const keyed = KeyedSemaphore.create<string>({ maximumQueueSize: 10, permits: 1 });
await keyed.withPermit("account:42", async () => fetch('https://api.example.com/accounts/42'));
await keyed.waitForIdle('account:42');

// Coalesce — deduplicate concurrent calls
const coalesce = Coalesce.create<Response>();
const [a, b] = await Promise.all([
  coalesce.run('user:42', () => fetch('/api/user/42')),
  coalesce.run('user:42', () => fetch('/api/user/42')), // shares the first fetch
]);
// factory called once; both callers receive the same resolved value

// the shared completion is reserved before onCoalesceStart and the factory;
// a start-hook or factory rejection is shared by the leader and every joiner

// Coalesce — capping how long a caller waits on a stuck factory
const boundedCoalesce = Coalesce.create<Response>({ timeout: 5000 });
// each caller races its own 5s timeout against the shared in-flight promise;
// a caller whose timeout elapses rejects with CoalesceTimeoutError without
// evicting the entry or affecting other callers still waiting on it

// AsyncIter — composable async iterables
async function* nums(start: number, end: number): AsyncGenerator<number> {
  for (let i = start; i <= end; i++) { yield i; }
}

const merged = AsyncIter.merge(nums(1, 3), nums(10, 12));
const evens = AsyncIter.filter(merged, (n) => n % 2 === 0);
const enriched = AsyncIter.enrich(
  evens,
  async (n) => n > 5 ? { label: 'high' } : null,
  (n, e) => ({ n, ...e }),
);
for await (const item of enriched) {
  console.log(item); // 2, { n: 10, label: 'high' }, { n: 12, label: 'high' }
}
```

`Coalesce#run()` publishes the shared completion before it awaits `onCoalesceStart` or invokes the factory. Reentrant or concurrent callers for that key therefore join the same promise during either stage. A rejection from `onCoalesceStart` or the factory rejects that shared promise for the leader and every joiner, and the entry is removed after settlement.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/concurrency

## License

MIT
