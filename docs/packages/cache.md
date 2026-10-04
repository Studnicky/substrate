---
title: "@studnicky/cache"
description: In-process LRU cache with optional TTL, capacity eviction, and keyed single-flight memoization.
---

# @studnicky/cache

> Capacity-bounded LRU cache with per-entry and default TTL, O(1) promotion on read.

## What it is

`@studnicky/cache` is a composable in-process retention primitive: a bounded LRU store with TTL and stale thresholds, plus keyed memoization with single-flight coordination. It holds derived values close to one process; it does not become a database, distributed lock, or application cache product.

## What it is for

Use it when a Northstar Books process needs to reuse a recently computed catalogue projection, protect an expensive lookup from concurrent duplicate work, or bound memory while keeping freshness policy explicit. The consuming application owns keys, invalidation, authoritative writes, and cross-process coordination.

## Northstar Books examples

- **Observed memoization — cache and single-flight lifecycle** maps concurrent requests for the same book-order summary to one loader invocation. It proves that Northstar can reuse a successful result, coalesce matching in-flight requests, and observe hits, misses, and coalescing without making memoization an order system.
- **Observed cache — lifecycle hook trace** maps a small title-card cache to catalogue browsing. It proves the lifecycle events Northstar can emit when a card is stored, read, replaced, evicted, expired, deleted, or cleared while the catalogue remains authoritative elsewhere.

## Install

```bash
pnpm add @studnicky/cache
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

`@studnicky/cache/node` exports runtime cache operations, `@studnicky/cache/memoize` exports keyed memoization, and schemas remain available from `@studnicky/cache/entities`.

## Northstar Books catalogue reads

Northstar serves a frequently viewed title catalogue without treating an in-process cache as the source of truth. Cache a read model by stable catalogue query or title identifier, choose capacity and freshness bounds for that response, and refill it from the authoritative store after a miss. `LruCache` guarantees bounded memory, least-recently-used eviction, and lazy TTL removal; callers retain invalidation and cross-process coherence policy.

## Usage

Create an `LruCache` instance with a capacity, then use `set`, `get`, `has`, `delete`, and `clear`:

<<< ../../packages/cache/examples/basicCache.ts#usage

## Keyed memoization

`Memoize` composes cache retention with keyed single-flight execution. Supply the callback, cache capacity and TTL policy, and an explicit key derivation function. Successful results, including `undefined`, are cached; rejected calls are not. Concurrent calls for one derived key share the in-flight callback.

`Memoize` does not define application identity or persistence policy. The caller chooses a key whose result identity matches the callback’s semantics.

<!-- inline-ts-ok: This canonical published import path is verified by check-docs-exports. -->

```typescript
import { Memoize } from "@studnicky/cache/memoize";

const loadOrder = Memoize.create(
  async (orderId: string) => fetchOrder(orderId),
  { capacity: 100, ttlMs: 30_000 },
  { keyDeriver: (orderId: string): string => orderId },
);

const order = await loadOrder.call("order-42");
```

`invalidate(...args)` evicts one derived key, while `clear()` evicts every cached result. Subclasses can observe `onMemoHit`, `onMemoMiss`, and `onMemoCoalesced` without coupling memoization to a logging or metrics package.

<RunnableExample src="packages/cache/examples/observedMemoize" title="Observed memoization — cache and single-flight lifecycle" />

## LRU eviction

When the cache is at capacity, the least-recently-used entry is evicted on the next `set`. Reading an entry promotes it to most-recently-used:

<<< ../../packages/cache/examples/lruEviction.ts#usage

## TTL expiry

Pass `ttlMs` to expire entries automatically. Eviction is lazy: entries are removed on the next `get` or `has` after the TTL has elapsed:

<<< ../../packages/cache/examples/ttlExpiry.ts#usage

## Local replay and single-flight

When a Node process needs a short-lived replay window for one request key, compose `LruCache` with `Coalesce` at the application boundary. The recipe validates a finite, acyclic JSON payload once at intake, retains an immutable snapshot, and uses deep structural equality for both replayed and in-flight requests. Property order does not affect identity, while changed or invalid payloads reject. `tryGet` preserves a stored `undefined` result.

This is process-local coordination only: it is not durable idempotency, cross-process mutual exclusion, or a replacement for an authoritative write boundary.

<<< ../../packages/cache/examples/idempotencyReplayComposition.ts#usage

### Deterministic cache time

`LruCache.create` takes schema-validated config as its first argument and a `LruCacheCollaboratorsInterface` as its second. The collaborator's `clock` measures both TTL expiry and the soft `staleMs` threshold, so virtual time tests do not wait for wall time.

<!-- inline-ts-ok: focused dependency-injection illustration; the runnable cache examples cover observable behavior. -->

```typescript
import { VirtualClockProvider, VirtualTimeCounter } from "@studnicky/clock/node";
import { LruCache } from "@studnicky/cache/node";

const counter = VirtualTimeCounter.create({ startMs: 0 });
const cache = LruCache.create<string, string>(
  { capacity: 10, ttlMs: 1_000 },
  { clock: VirtualClockProvider.create(counter) },
);
```

## Try it

### Lifecycle hooks

`TracingCache` subclasses `LruCache` and overrides eight hooks: `onHit`, `onMiss`, `onSet`, `onUpdate`, `onEvict`, `onExpire`, `onDelete`, and `onClear`. With capacity=2, watch the event sequence: set a, set b, hit a, update a, evict b for capacity, miss b, delete c, set d, clear. A second TTL scenario shows expire firing before miss.

<RunnableExample src="packages/cache/examples/observedCache" title="Observed cache — lifecycle hook trace" />

## Observability hooks

`LruCache` exposes protected lifecycle hooks that a subclass can override to
add logging, timing, or metrics without any changes to the caller. The base
class never calls any logger or metrics library. All hooks are no-ops by
default.

| Hook                   | When it fires                                                                                     | Args                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `onHit(key, value)`    | `get()` finds a live, non-expired entry                                                           | `key: K`, `value: V`                          |
| `onStale(key, value)`  | `get()` finds a live entry past its `staleMs` threshold                                           | `key: K`, `value: V`                          |
| `onMiss(key)`          | `get()` returns `undefined` (key absent or entry expired)                                         | `key: K`                                      |
| `onSet(key)`           | `set()` inserts a **new** key                                                                     | `key: K`                                      |
| `onUpdate(key)`        | `set()` overwrites a value for an **existing** key                                                | `key: K`                                      |
| `onEvict(key, reason)` | An entry is removed to make room at capacity                                                      | `key: K`, `reason: 'capacity'`                |
| `onExpire(key)`        | `get()` or `has()` encounters an entry past its TTL and lazily removes it — fires before `onMiss` | `key: K`                                      |
| `onDelete(key)`        | `delete()` removes an entry that existed — not called for absent keys                             | `key: K`                                      |
| `onClear(count)`       | `clear()` empties the cache                                                                       | `count: number` (entries present before wipe) |

<<< ../../packages/cache/examples/observedCache.ts#usage

The base class never calls any logger or metrics library. All hooks are
no-ops by default.

## API

| Export                           | Type      | Description                                                                                                            |
| -------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `LruCache<K, V>`                 | class     | LRU + TTL cache; generic key and value types                                                                           |
| `Memoize<Args, Result>`          | class     | Keyed successful-result cache with keyed single-flight execution                                                       |
| `LruCacheCollaboratorsInterface` | interface | Typed collaborators `LruCache.create` accepts alongside schema-validated config — currently an optional clock provider |
| `CacheError`                     | class     | Base package error                                                                                                     |
| `CacheConfigError`               | class     | Invalid cache configuration                                                                                            |

### `Memoize<Args, Result>`

| Member       | Signature                                                                                   | Description                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `create`     | `static create<Args, Result>(callback, cacheConfig, { keyDeriver }): Memoize<Args, Result>` | Constructs memoization from a callback, schema-validated cache config, and explicit derived key |
| `call`       | `(...args: Args) => Promise<Result>`                                                        | Returns a cached successful result or runs/coalesces the callback                               |
| `invalidate` | `(...args: Args) => void`                                                                   | Evicts one result by its derived key                                                            |
| `clear`      | `() => void`                                                                                | Evicts every cached result                                                                      |

### `LruCache<K, V>`

| Member        | Signature                                                                                              | Description                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `create`      | `static create<K, V>(config: unknown, collaborators?: LruCacheCollaboratorsInterface): LruCache<K, V>` | Constructs a cache from schema-validated config and a typed clock collaborator |
| `size`        | `get size(): number`                                                                                   | Current entry count                                                            |
| `get`         | `(key: K) => V \| undefined`                                                                           | Returns value; promotes to MRU; evicts expired                                 |
| `tryGet`      | `(key: K) => { found: boolean; value: V \| undefined }`                                                | Distinguishes a miss from a stored `undefined` value in one traversal          |
| `set`         | `(key: K, value: V, options?: { staleMs?: number; ttlMs?: number }) => void`                           | Stores a value with optional per-entry staleness and expiry thresholds         |
| `has`         | `(key: K) => boolean`                                                                                  | True if key exists and has not expired                                         |
| `delete`      | `(key: K) => boolean`                                                                                  | Removes entry; returns whether it existed                                      |
| `deleteWhere` | `(predicate: (key: K, value: V) => boolean) => number`                                                 | Removes matching entries and returns the removal count                         |
| `clear`       | `() => void`                                                                                           | Removes all entries                                                            |

## Entities

`@studnicky/cache/entities` exports cache option and node-timing schemas.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import { LruCacheOptionsEntity } from "@studnicky/cache/entities";
```

## Public entrypoints

| Import path                   | Use it when                                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@studnicky/cache/node`       | A Northstar Books server or worker needs the runtime LRU cache, errors, and cache operations for derived catalogue or order reads.                                          |
| `@studnicky/cache/browser`    | A Northstar Books browser bundle needs the same in-memory cache primitive for local derived view state; it is a runtime alternative to `/node`, not a second cache product. |
| `@studnicky/cache/memoize`    | A book-detail or order-summary loader needs successful-result reuse and keyed single-flight work.                                                                           |
| `@studnicky/cache/interfaces` | A consumer needs the typed cache collaborator contract, such as a deterministic clock, while composing its own application policy.                                          |
| `@studnicky/cache/entities`   | A consumer needs cache configuration and timing schemas as contracts at its configuration boundary.                                                                         |

## Exports

| Symbol                           | Purpose                                                                     | Import path                   |
| -------------------------------- | --------------------------------------------------------------------------- | ----------------------------- |
| `LruCache`                       | Stores bounded least-recently-used values with optional expiry.             | `@studnicky/cache/node`       |
| `Memoize`                        | Caches successful callback results and coalesces matching concurrent calls. | `@studnicky/cache/memoize`    |
| `CacheConfigError`               | Represents invalid cache configuration.                                     | `@studnicky/cache/node`       |
| `CacheError`                     | Base error for cache failures.                                              | `@studnicky/cache/node`       |
| `LruCacheCollaboratorsInterface` | Defines the typed clock collaborator `create` accepts alongside config.     | `@studnicky/cache/interfaces` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/cache)
