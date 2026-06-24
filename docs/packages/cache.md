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

Pass `ttlMs` to expire entries automatically. Eviction is lazy — entries are removed on the next `get` or `has` after the TTL has elapsed:

<<< ../../packages/cache/examples/ttlExpiry.ts#usage

## Bulk insert

`setMany` inserts many entries at once. Entries are processed in argument order — the last entry in the array is the most-recently-used after the call. When the batch causes capacity overflow, entries earlier in the argument list are evicted first:

<<< ../../packages/cache/examples/setMany.ts#usage

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
