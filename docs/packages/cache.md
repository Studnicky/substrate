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

`@studnicky/cache` is the sole public code entrypoint.

## Usage

Create an `LruCache` instance with a capacity, then use `set`, `get`, `has`, `delete`, and `clear`:

<<< ../../packages/cache/examples/basicCache.ts#usage

## LRU eviction

When the cache is at capacity, the least-recently-used entry is evicted on the next `set`. Reading an entry promotes it to most-recently-used:

<<< ../../packages/cache/examples/lruEviction.ts#usage

## TTL expiry

Pass `ttlMs` to expire entries automatically. Eviction is lazy: entries are removed on the next `get` or `has` after the TTL has elapsed:

<<< ../../packages/cache/examples/ttlExpiry.ts#usage

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
| `LruCacheOptionsEntity` | namespace | Schema, derived `Type`, and validator for `{ capacity, staleMs?, ttlMs? }` |
| `LruCacheNodeTimingEntity` | namespace | Schema, derived `Type`, and validator for cache-node `expiresAt` and `staleAt` timestamps |
| `CacheError` | class | Base package error |
| `CacheConfigError` | class | Invalid cache configuration |

### `LruCache<K, V>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create<K, V>(options: LruCacheOptionsEntity.Type): LruCache<K, V>` | Constructs a cache from validated options |
| `size` | `get size(): number` | Current entry count |
| `get` | `(key: K) => V \| undefined` | Returns value; promotes to MRU; evicts expired |
| `tryGet` | `(key: K) => { found: boolean; value: V \| undefined }` | Distinguishes a miss from a stored `undefined` value in one traversal |
| `set` | `(key: K, value: V, options?: { staleMs?: number; ttlMs?: number }) => void` | Stores a value with optional per-entry staleness and expiry thresholds |
| `has` | `(key: K) => boolean` | True if key exists and has not expired |
| `delete` | `(key: K) => boolean` | Removes entry; returns whether it existed |
| `deleteWhere` | `(predicate: (key: K, value: V) => boolean) => number` | Removes matching entries and returns the removal count |
| `clear` | `() => void` | Removes all entries |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/cache)
