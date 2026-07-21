# @studnicky/entity-store

> Normalized, ID-indexed entity collection with CRUD operations and O(1) lookup.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/entity-store)

A normalized, ID-indexed collection of entities — the `createEntityAdapter` shape (`upsertOne`/`upsertMany`/`removeOne`/`removeMany`/`setAll`) with O(1) lookup by id and configurable iteration order, without any caching or fetch-lifecycle machinery. `EntityStore` owns only the normalized CRUD container: it has no notion of cache-tag invalidation and no dependency graph between entities.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/entity-store
```

## Usage

```typescript
import type { UserEntity } from './entities/UserEntity.js';

import { EntityStore } from '@studnicky/entity-store';

const store = EntityStore.create<UserEntity.Type>({
  selectId: (user) => user.id
});

store.upsertOne({ id: 'u1', name: 'Alice' });
store.upsertMany([
  { id: 'u2', name: 'Bob' },
  { id: 'u3', name: 'Carol' }
]);

store.getAll(); // [{ id: 'u1', ... }, { id: 'u2', ... }, { id: 'u3', ... }]
store.getById('u2'); // { id: 'u2', name: 'Bob' }
store.removeOne('u1'); // true
store.size; // 2
```

Pass `sortComparer` to keep `getAll()` sorted instead of insertion-ordered:

```typescript
const store = EntityStore.create<UserEntity.Type>({
  selectId: (user) => user.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
});
```

## Extending

Subclass `EntityStore` and override any of the protected lifecycle hooks to add telemetry without coupling the base class to a metrics library.

```typescript
import { EntityStore } from '@studnicky/entity-store';

class InstrumentedStore<T> extends EntityStore<T> {
  protected override onUpsert(id: string, entity: T): void {
    metrics.increment('entity-store.upsert');
  }

  protected override onRemove(id: string): void {
    metrics.increment('entity-store.remove');
  }

  protected override onReplaceAll(count: number): void {
    metrics.gauge('entity-store.size', count);
  }
}
```

## API reference

| Export | Type | Description |
|--------|------|-------------|
| `EntityStore<TEntity, TId>` | class | Normalized entity collection; generic entity and id types |
| `EntityStoreOptionsInterface<TEntity, TId>` | interface | Runtime configuration contract containing the required `selectId` function and optional `sortComparer` function |

### `EntityStore<TEntity, TId>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create<TEntity, TId>(options): EntityStore<TEntity, TId>` | Constructs a store from options |
| `size` | `get size(): number` | Current entity count |
| `upsertOne` | `(entity: TEntity) => void` | Derives id via `selectId`; inserts or overwrites |
| `upsertMany` | `(entities: readonly TEntity[]) => void` | Upserts every entity in array order |
| `removeOne` | `(id: TId) => boolean` | Removes an entity; returns whether it existed |
| `removeMany` | `(ids: readonly TId[]) => number` | Removes each id; returns the count actually removed |
| `setAll` | `(entities: readonly TEntity[]) => void` | Replaces the entire collection |
| `getAll` | `() => readonly TEntity[]` | Returns a defensive snapshot, sorted by `sortComparer` if configured |
| `getById` | `(id: TId) => TEntity \| undefined` | Returns the entity for `id`, or `undefined` |
| `getIds` | `() => readonly TId[]` | Returns every id, in insertion order |
| `hookErrorCount` | `get hookErrorCount(): number` | Count of hook failures recorded since construction |
| `getHookErrors` | `() => readonly HookInvocationError[]` | Defensive copy of every hook failure recorded since construction |

## Hooks

| Hook | When it fires | Args |
|------|--------------|------|
| `onUpsert(id, entity)` | Once per entity from `upsertOne`/`upsertMany`, after it is stored | `id: TId`, `entity: TEntity` |
| `onRemove(id)` | `removeOne`/`removeMany` removes an entity that actually existed — not called for absent ids | `id: TId` |
| `onReplaceAll(count)` | Once from `setAll`, with the count of entities in the new collection | `count: number` |

The base class never calls any logger or metrics library. All hooks are no-ops by default.

A hook override that throws or rejects does not abort the mutation that triggered it — the failure is recorded instead of propagating, backed internally by `@studnicky/errors`'s `HookInvoker`. Inspect recorded failures via `hookErrorCount`/`getHookErrors()`:

```typescript
class FaultyStore extends EntityStore<UserEntity.Type> {
  protected override onUpsert(): void {
    throw new Error('boom');
  }
}

const store = FaultyStore.create({ selectId: (e) => e.id });
await store.upsertOne({ id: '1' });
store.hookErrorCount; // 1
```

## No eviction or TTL

Unlike `@studnicky/cache`'s `LruCache`, `EntityStore` is deliberately unbounded and non-evicting: there is no capacity limit, no TTL, and no lazy expiry. This is a normalized collection — the in-memory mirror of a set of records your application already owns — not a cache of derived or externally-sourced values. If you need eviction, staleness, or TTL semantics, reach for `@studnicky/cache` instead; `EntityStore` composes cleanly alongside it when a caller needs both a normalized collection and a bounded cache for a different purpose.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/entity-store

## License

MIT
