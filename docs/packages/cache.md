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

## Usage

Create an `LruCache` instance with a capacity, then use `set`, `get`, `has`, `delete`, and `clear`:

<<< ../../packages/cache/examples/basicCache.ts#usage

## LRU eviction

When the cache is at capacity, the least-recently-used entry is evicted on the next `set`. Reading an entry promotes it to most-recently-used:

<<< ../../packages/cache/examples/lruEviction.ts#usage

## TTL expiry

Pass `ttlMs` to expire entries automatically. Eviction is lazy: entries are removed on the next `get` or `has` after the TTL has elapsed:

<<< ../../packages/cache/examples/ttlExpiry.ts#usage

## Bulk insert

`setMany` inserts many entries at once. Entries are processed in argument order; the last entry in the array is the most-recently-used after the call. When the batch causes capacity overflow, entries earlier in the argument list are evicted first:

<<< ../../packages/cache/examples/setMany.ts#usage

## Try it

### Builder

`LruCache.builder().withCapacity(2).withTtlMs(5_000).withPrefix('demo').build()` constructs the cache through the fluent builder. Press Execute to watch set, get, and LRU eviction at capacity 2: reading a key promotes it, so the next insert evicts the other key. The final assertions confirm which keys survived.

<RunnableExample src="packages/cache/examples/builder-cache" title="Builder — fluent LRU cache construction" />

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
| `LruCacheBuilder<K, V>` | class | Fluent builder for `LruCache`; produced by `LruCache.builder()` |
| `LruCacheOptionsType` | type | `{ capacity, prefix?, ttlMs? }` |

### `LruCache<K, V>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create<K, V>(options): LruCache<K, V>` | Constructs a cache from options |
| `builder` | `static builder<K, V>(): LruCacheBuilder<K, V>` | Returns a fluent builder for constructing a cache |
| `size` | `get size(): number` | Current entry count |
| `get` | `(key: K) => V \| undefined` | Returns value; promotes to MRU; evicts expired |
| `set` | `(key: K, value: V, ttlMs?: number) => void` | Stores value; evicts LRU tail when at capacity |
| `setMany` | `(entries: ReadonlyArray<readonly [K, V]>, ttlMs?: number) => void` | Inserts entries in argument order; last entry is MRU; empty array is a no-op |
| `has` | `(key: K) => boolean` | True if key exists and has not expired |
| `delete` | `(key: K) => boolean` | Removes entry; returns whether it existed |
| `clear` | `() => void` | Removes all entries |

### `LruCacheBuilder<K, V>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `withCapacity` | `(value: number) => this` | Sets the cache capacity (required before `build()`) |
| `withTtlMs` | `(value: number) => this` | Sets the default TTL in milliseconds |
| `withPrefix` | `(value: string) => this` | Sets the key namespace prefix |
| `build` | `() => LruCache<K, V>` | Constructs the cache; throws if `capacity` was not set |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/cache)
