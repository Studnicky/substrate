---
"@studnicky/entity-store": major
---

### Changed

- `EntityStoreOptionsInterface<TEntity, TId>` defines the callable construction contract, while hook diagnostics use `@studnicky/errors`'s canonical `HookInvocationError` directly.
- `EntityStore.create(options)` is the sole construction entry point; the constructor remains protected for subclassing.

### Added

- `EntityStore<TEntity, TId>` class: a normalized, ID-indexed entity collection with `upsertOne`/`upsertMany`/`removeOne`/`removeMany`/`setAll` CRUD, O(1) lookup via an internal `Map`, and configurable iteration order via `sortComparer`. Deliberately unbounded and non-evicting — no capacity limit, no TTL, no cache-tag invalidation.
- Protected lifecycle hooks (`onUpsert`, `onRemove`, `onReplaceAll`) for subclass-level observability, following the substrate no-op hook idiom.
