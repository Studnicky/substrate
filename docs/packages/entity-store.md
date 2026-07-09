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

## No eviction or TTL

Unlike `@studnicky/cache`'s `LruCache`, `EntityStore` is deliberately unbounded and non-evicting: no capacity limit, no TTL, no lazy expiry. It is the in-memory mirror of a normalized collection your application already owns, not a cache of derived or externally-sourced values. Reach for `@studnicky/cache` when eviction or staleness semantics are needed instead.

## API

| Export | Type | Description |
|--------|------|-------------|
| `EntityStore<TEntity, TId>` | class | Normalized entity collection; generic entity and id types |
| `EntityStoreBuilder<TEntity, TId>` | class | Fluent builder for `EntityStore`; produced by `EntityStore.builder()` |
| `EntityStoreOptionsType<TEntity, TId>` | type | `{ selectId, sortComparer? }` |

### `EntityStore<TEntity, TId>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `create` | `static create<TEntity, TId>(options): EntityStore<TEntity, TId>` | Constructs a store from options |
| `builder` | `static builder<TEntity, TId>(): EntityStoreBuilder<TEntity, TId>` | Returns a fluent builder for constructing a store |
| `size` | `get size(): number` | Current entity count |
| `upsertOne` | `(entity: TEntity) => void` | Derives id via `selectId`; inserts or overwrites |
| `upsertMany` | `(entities: readonly TEntity[]) => void` | Upserts every entity in array order |
| `removeOne` | `(id: TId) => boolean` | Removes an entity; returns whether it existed |
| `removeMany` | `(ids: readonly TId[]) => number` | Removes each id; returns the count actually removed |
| `setAll` | `(entities: readonly TEntity[]) => void` | Replaces the entire collection |
| `getAll` | `() => readonly TEntity[]` | Returns every entity, sorted by `sortComparer` if configured |
| `getById` | `(id: TId) => TEntity \| undefined` | Returns the entity for `id`, or `undefined` |
| `getIds` | `() => readonly TId[]` | Returns every id, in insertion order |

### `EntityStoreBuilder<TEntity, TId>`

| Member | Signature | Description |
|--------|-----------|-------------|
| `withSelectId` | `(value: (entity: TEntity) => TId) => this` | Sets the id-derivation function (required before `build()`) |
| `withSortComparer` | `(value: (a: TEntity, b: TEntity) => number) => this` | Sets the optional sort comparator for `getAll()` |
| `build` | `() => EntityStore<TEntity, TId>` | Constructs the store; throws if `selectId` was not set |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/entity-store)
