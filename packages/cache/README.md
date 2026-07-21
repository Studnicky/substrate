# @studnicky/cache

> Capacity-bounded LRU cache with per-entry and default TTL, O(1) promotion on read.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/cache)

A lightweight, generic LRU (Least Recently Used) cache with optional time-to-live support. Entries are evicted when the cache reaches capacity, always removing the least-recently-used entry first. TTL expiry is lazy — expired entries are evicted on access rather than via a background timer.

Each entry can carry its own TTL, overriding the cache-level default. This makes the cache suitable for mixed workloads where some data expires quickly and other data is long-lived.

Entries can also carry an optional `staleMs` threshold, shorter than `ttlMs`: once past it, `get()` still serves the (still-live) value but fires `onStale` instead of `onHit`, so a subclass can flag aging data without evicting it early. `deleteWhere(predicate)` removes every entry matching a `(key, value) => boolean` predicate in one call, firing `onDelete` for each removal.

`@studnicky/cache` is the sole public code entrypoint. It exports `LruCacheOptionsEntity` for construction data and `LruCacheNodeTimingEntity` for the schema-derived expiry and staleness fields composed by cache nodes.

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

// 1. Basic set/get — construct via LruCache.create()
const cache = LruCache.create<string, number>({ capacity: 100 });

cache.set('hits', 42);
const hits = cache.get('hits'); // 42

// 2. Default TTL — all entries expire after 5 seconds unless overridden
const ttlCache = LruCache.create<string, string>({ capacity: 50, ttlMs: 5_000 });

ttlCache.set('session', 'abc123');
const session = ttlCache.get('session'); // 'abc123' (within 5s)

// 3. Per-entry TTL override — this entry expires after 1 second regardless of cache default
ttlCache.set('shortLived', 'temp', 1_000);

// 4. has, delete, clear, size
const store = LruCache.create<string, boolean>({ capacity: 10 });

store.set('flag', true);
store.has('flag');    // true
store.size;           // 1

store.delete('flag'); // true (entry existed)
store.has('flag');    // false

store.set('a', true);
store.set('b', true);
store.clear();
store.size;           // 0

// 5. staleMs — soft staleness marker, shorter than ttlMs
// The entry stays live and servable past staleMs (still promoted to MRU on read),
// but get() fires onStale instead of onHit so a subclass can flag it as aging.
class ObservedCache extends LruCache<string, string> {
  protected override onHit(key: string, value: string): void {
    console.log(`hit key=${key} value=${value}`);
  }
  protected override onStale(key: string, value: string): void {
    console.log(`stale key=${key} value=${value}`);
  }
}

const staleCache = ObservedCache.create<string, string>({ capacity: 50, staleMs: 1_000, ttlMs: 10_000 });
staleCache.set('page', 'v1');
// Before 1s: get('page') fires onHit
// After 1s but before 10s: get('page') still returns 'v1', fires onStale instead of onHit
// After 10s: get('page') returns undefined (hard expiry — onExpire + onMiss, as usual)

// Per-entry staleMs override (ttlMs, staleMs) — mirrors the per-entry TTL override
staleCache.set('short-stale', 'v1', 10_000, 500); // 10s ttl, 500ms stale threshold

// 6. deleteWhere — bulk/predicate invalidation
// Removes every entry for which the predicate returns true, firing onDelete for each.
const tagged = LruCache.create<string, { tag: string }>({ capacity: 100 });
tagged.set('a', { tag: 'stale-group' });
tagged.set('b', { tag: 'keep' });
tagged.set('c', { tag: 'stale-group' });

const removedCount = tagged.deleteWhere((_key, value) => { return value.tag === 'stale-group'; });
// removedCount === 2; tagged.has('a') === false; tagged.has('b') === true
```

## License

MIT
