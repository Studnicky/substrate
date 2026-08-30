---
title: '@studnicky/cache'
description: In-process LRU cache with optional TTL and capacity eviction.
---

# @studnicky/cache

> Capacity-bounded LRU cache with per-entry and default TTL, O(1) promotion on read.

## Install

```bash
pnpm add @studnicky/cache
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

`@studnicky/cache` exposes runtime cache operations at its root and schema namespaces at `@studnicky/cache/entities`.

## Usage

Create an `LruCache` instance with a capacity, then use `set`, `get`, `has`, `delete`, and `clear`:

<<< ../../packages/cache/examples/basicCache.ts#usage

## LRU eviction

When the cache is at capacity, the least-recently-used entry is evicted on the next `set`. Reading an entry promotes it to most-recently-used:

<<< ../../packages/cache/examples/lruEviction.ts#usage

## TTL expiry

Pass `ttlMs` to expire entries automatically. Eviction is lazy: entries are removed on the next `get` or `has` after the TTL has elapsed:

<<< ../../packages/cache/examples/ttlExpiry.ts#usage

### Deterministic cache time

`LruCache.create` accepts a `ClockProviderInterface` through `clock`. The provider measures both TTL expiry and the soft `staleMs` threshold, so virtual time tests do not wait for wall time.

<!-- inline-ts-ok: focused dependency-injection illustration; the runnable cache examples cover observable behavior. -->
```typescript
import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock';
import { LruCache } from '@studnicky/cache';

const counter = VirtualTimeCounter.create({ startMs: 0 });
const cache = LruCache.create<string, string>({
  capacity: 10,
  clock: VirtualClockProvider.create(counter),
  ttlMs: 1_000
});
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

| Hook | When it fires | Args |
|------|--------------|------|
| `onHit(key, value)` | `get()` finds a live, non-expired entry | `key: K`, `value: V` |
| `onStale(key, value)` | `get()` finds a live entry past its `staleMs` threshold | `key: K`, `value: V` |
| `onMiss(key)` | `get()` returns `undefined` (key absent or entry expired) | `key: K` |
| `onSet(key)` | `set()` inserts a **new** key | `key: K` |
| `onUpdate(key)` | `set()` overwrites a value for an **existing** key | `key: K` |
| `onEvict(key, reason)` | An entry is removed to make room at capacity | `key: K`, `reason: 'capacity'` |
| `onExpire(key)` | `get()` or `has()` encounters an entry past its TTL and lazily removes it — fires before `onMiss` | `key: K` |
| `onDelete(key)` | `delete()` removes an entry that existed — not called for absent keys | `key: K` |
| `onClear(count)` | `clear()` empties the cache | `count: number` (entries present before wipe) |

<<< ../../packages/cache/examples/observedCache.ts#usage

The base class never calls any logger or metrics library. All hooks are
no-ops by default.

## API

| Export | Type | Description |
|--------|------|-------------|
| `LruCache<K, V>` | class | LRU + TTL cache; generic key and value types |
| `LruCacheCreateOptionsInterface` | interface | Schema settings plus an optional clock provider |
| `CacheError` | class | Base package error |
| `CacheConfigError` | class | Invalid cache configuration |

### `LruCache<K, V>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create<K, V>(options: LruCacheCreateOptionsInterface): LruCache<K, V>` | Constructs a cache from validated settings and an optional clock provider |
| `size` | `get size(): number` | Current entry count |
| `get` | `(key: K) => V \| undefined` | Returns value; promotes to MRU; evicts expired |
| `tryGet` | `(key: K) => { found: boolean; value: V \| undefined }` | Distinguishes a miss from a stored `undefined` value in one traversal |
| `set` | `(key: K, value: V, options?: { staleMs?: number; ttlMs?: number }) => void` | Stores a value with optional per-entry staleness and expiry thresholds |
| `has` | `(key: K) => boolean` | True if key exists and has not expired |
| `delete` | `(key: K) => boolean` | Removes entry; returns whether it existed |
| `deleteWhere` | `(predicate: (key: K, value: V) => boolean) => number` | Removes matching entries and returns the removal count |
| `clear` | `() => void` | Removes all entries |

## Entities

`@studnicky/cache/entities` exports cache option and node-timing schemas.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import { LruCacheOptionsEntity } from '@studnicky/cache/entities';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `LruCache` | Stores bounded least-recently-used values with optional expiry. | `@studnicky/cache` |
| `CacheConfigError` | Represents invalid cache configuration. | `@studnicky/cache` |
| `CacheError` | Base error for cache failures. | `@studnicky/cache` |
| `LruCacheCreateOptionsInterface` | Defines cache settings and the clock collaborator. | `@studnicky/cache` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/cache)
