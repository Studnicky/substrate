# Changelog

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `LruCache<K, V>` class: in-process LRU + TTL key-value store with O(1) promotion via doubly-linked list.
- `get(key)` returns `V | undefined`; promotes entry to MRU on hit, lazily evicts on expiry.
- `set(key, value, ttlMs?)` inserts or updates an entry with optional per-entry TTL override over the global default.
- `has(key)` checks existence without promoting; lazily evicts expired entries.
- `delete(key)` removes an entry and returns `true` on success, `false` if absent.
- `clear()` empties the cache and resets the linked list.
- `size` getter reflecting the current entry count.
- `LruCacheOptions` interface with `capacity`, optional `ttlMs`, and optional `staleMs` fields.
- No background sweep, no timers — all TTL checks are lazy on access.
