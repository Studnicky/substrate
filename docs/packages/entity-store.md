---
title: '@studnicky/entity-store'
description: Normalized, ID-indexed entity collection with CRUD operations and O(1) lookup.
---

# @studnicky/entity-store

> Normalized, ID-indexed entity collection with CRUD operations and O(1) lookup.

## Install

```bash
pnpm add @studnicky/entity-store
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

`EntityStore` does not fetch or persist data — the caller supplies entities via `upsertOne`/`upsertMany`/`setAll`, and the store tracks a normalized, ID-indexed collection with O(1) lookup:

<<< ../../packages/entity-store/examples/observedEntityStore.ts#usage

## Observability hooks

`EntityStore` exposes protected lifecycle hooks that a subclass can override to
add logging, timing, or metrics without any changes to the caller. The base
class never calls any logger or metrics library. All hooks are no-ops by
default.

| Hook | When it fires | Args |
|------|--------------|------|
| `onUpsert(id, entity)` | Once per entity from `upsertOne`/`upsertMany`, after it is stored | `id: TId`, `entity: TEntity` |
| `onRemove(id)` | `removeOne`/`removeMany` removes an entity that actually existed — not called for absent ids | `id: TId` |
| `onReplaceAll(count)` | Once from `setAll`, with the count of entities in the new collection | `count: number` |

A hook override that throws or rejects does not abort the mutation that triggered it — the failure is recorded instead of propagating; inspect it via `hookErrorCount` (a running total) and `getHookErrors()` (a defensive copy of every recorded `{ hookName, cause }` entry), backed internally by `@studnicky/errors`'s `HookInvoker`.

<!-- inline-ts-ok: three-line failure-recording snippet; no existing transcluded example demonstrates a throwing hook override -->
```typescript
store.hookErrorCount; // 1 after a throwing onUpsert override
store.getHookErrors(); // [{ hookName: 'onUpsert', cause: Error }]
```

## No eviction or TTL

Unlike `@studnicky/cache`'s `LruCache`, `EntityStore` is deliberately unbounded and non-evicting: no capacity limit, no TTL, no lazy expiry. It is the in-memory mirror of a normalized collection your application already owns, not a cache of derived or externally-sourced values. Reach for `@studnicky/cache` when eviction or staleness semantics are needed instead.

## API

| Export | Type | Description |
|--------|------|-------------|
| `EntityStore<TEntity, TId>` | class | Normalized entity collection; generic entity and id types |
| `EntityStoreOptionsInterface<TEntity, TId>` | interface | Runtime configuration contract containing the required `selectId` function and optional `sortComparer` function |
| `HookErrorEntryInterface` | interface | Recorded lifecycle-hook failure contract |

### `EntityStore<TEntity, TId>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create<TEntity, TId>(options): EntityStore<TEntity, TId>` | Constructs a store from options |
| `size` | `get size(): number` | Current entity count |
| `upsertOne` | `(entity: TEntity) => Promise<void>` | Derives id via `selectId`; inserts or overwrites |
| `upsertMany` | `(entities: readonly TEntity[]) => Promise<void>` | Upserts every entity in array order |
| `removeOne` | `(id: TId) => Promise<boolean>` | Removes an entity; resolves whether it existed |
| `removeMany` | `(ids: readonly TId[]) => Promise<number>` | Removes each id; resolves the count actually removed |
| `setAll` | `(entities: readonly TEntity[]) => Promise<void>` | Replaces the entire collection |
| `getAll` | `() => readonly TEntity[]` | Returns a defensive snapshot, sorted by `sortComparer` if configured |
| `getById` | `(id: TId) => TEntity \| undefined` | Returns the entity for `id`, or `undefined` |
| `getIds` | `() => readonly TId[]` | Returns every id, in insertion order |
| `hookErrorCount` | `get hookErrorCount(): number` | Count of hook failures recorded since construction |
| `getHookErrors` | `() => readonly HookErrorEntryInterface[]` | Defensive copy of every hook failure recorded since construction |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/entity-store)
