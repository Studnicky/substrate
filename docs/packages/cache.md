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

```typescript
import { LruCache } from '@studnicky/cache';

// Fixed capacity, no TTL
const cache = new LruCache<string, Response>({ capacity: 500 });

cache.set('key', response);
const hit = cache.get('key'); // Response | undefined

// With a default TTL for all entries
const ttlCache = new LruCache<string, string>({
  capacity: 200,
  ttlMs: 60_000, // 1 minute
});

ttlCache.set('session:abc', token);
```

### Per-entry TTL override

```typescript
// Override TTL on individual writes
cache.set('short-lived', value, 5_000); // expires in 5 s regardless of default
```

### Key prefix

```typescript
// All internal keys are prefixed with "user:"
const userCache = new LruCache<number, UserRecord>({
  capacity: 1000,
  prefix: 'user',
});
```

### Other operations

```typescript
cache.has(key);    // checks existence and lazily evicts expired entries
cache.delete(key); // returns true if the entry existed
cache.clear();     // empties the cache and resets the LRU list
cache.size;        // count of stored entries (may include lazily un-evicted expired entries)
```

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
