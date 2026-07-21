---
"@studnicky/cache": major
---

### Changed

- `LruCache` constructor is `protected`; instances are constructed through `LruCache.create(options)`.
- Cache configuration contains only effective runtime options: `capacity`, `staleMs`, and `ttlMs`.
- `LruCacheNodeTimingEntity` owns the schema-derived `expiresAt` and `staleAt` fields composed by cache nodes.
- `@studnicky/cache` is the sole public code entrypoint.
