# @studnicky/cache

> Capacity-bounded LRU cache with per-entry and default TTL, O(1) promotion on read.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/cache)

A lightweight, generic LRU (Least Recently Used) cache with optional time-to-live support. Entries are evicted when the cache reaches capacity, always removing the least-recently-used entry first. TTL expiry is lazy — expired entries are evicted on access rather than via a background timer.

Each entry can carry its own TTL, overriding the cache-level default. This makes the cache suitable for mixed workloads where some data expires quickly and other data is long-lived.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/cache
```

## Usage

```typescript
import { LruCache } from '@studnicky/cache';

// 1. Basic set/get
const cache = new LruCache<string, number>({ capacity: 100 });

cache.set('hits', 42);
const hits = cache.get('hits'); // 42

// 2. Default TTL — all entries expire after 5 seconds unless overridden
const ttlCache = new LruCache<string, string>({ capacity: 50, ttlMs: 5_000 });

ttlCache.set('session', 'abc123');
const session = ttlCache.get('session'); // 'abc123' (within 5s)

// 3. Per-entry TTL override — this entry expires after 1 second regardless of cache default
ttlCache.set('shortLived', 'temp', 1_000);

// 4. has, delete, clear, size
const store = new LruCache<string, boolean>({ capacity: 10 });

store.set('flag', true);
store.has('flag');    // true
store.size;           // 1

store.delete('flag'); // true (entry existed)
store.has('flag');    // false

store.set('a', true);
store.set('b', true);
store.clear();
store.size;           // 0
```

## License

MIT
