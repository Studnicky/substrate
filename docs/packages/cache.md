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

## API

| Export | Type | Description |
|--------|------|-------------|
| `LruCache<K, V>` | class | LRU + TTL cache; generic key and value types |
| `LruCacheOptionsType` | type | `{ capacity, prefix?, ttlMs? }` |

### `LruCache<K, V>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(options: LruCacheOptionsType)` | Creates the cache |
| `size` | `get size(): number` | Current entry count |
| `get` | `(key: K) => V \| undefined` | Returns value; promotes to MRU; evicts expired |
| `set` | `(key: K, value: V, ttlMs?: number) => void` | Stores value; evicts LRU tail when at capacity |
| `has` | `(key: K) => boolean` | True if key exists and has not expired |
| `delete` | `(key: K) => boolean` | Removes entry; returns whether it existed |
| `clear` | `() => void` | Removes all entries |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/cache)
