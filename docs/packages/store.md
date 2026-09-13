---
title: '@studnicky/store'
description: Observable browser-ready state stores with interchangeable persistence.
---

# @studnicky/store

> Keep application state observable while selecting an in-memory or browser-native persistence target.

## Install

```bash
pnpm add @studnicky/store
```

## Core store

`Store<TState>` owns one named state value. `setState` and `update` persist before notifying subscribers; `hydrate` restores the named value; and `clear` removes it before publishing the initial state.

<<< ../../packages/store/examples/memory-store.ts#usage

## Context-scoped state (Node)

`ContextStore` resolves one backing `Store` while a `Context` scope is active. It delegates every operation to that store, so serialized writes, persistence, and listener protections remain the standard Store behavior. It implements `StoreInterface<TState>`, so it can be a layer in `@studnicky/strata-store-kit/node`.

<!-- inline-ts-ok: Consumer composition example showing the published Node runtime and neutral interface imports. -->
```typescript
import { Context } from '@studnicky/context/node';
import { ContextStore, MemoryPersistence, Store } from '@studnicky/store/node';
import type { ContextStoreOptionsInterface } from '@studnicky/store/interfaces';

const context = Context.create({ name: 'request' });
const options: ContextStoreOptionsInterface<{ readonly items: string[] }> = {
  context,
  key: 'request.cart',
  createStore: () => Store.create({
    initialState: { items: [] },
    key: 'request.cart',
    persistence: MemoryPersistence.create(),
  }),
};
const cart = ContextStore.create(options);
const scope = context.initialize();

await scope.execute(async () => {
  await cart.update((state) => ({ items: [...state.items, 'sku-42'] }));
});
scope.terminate();
```

## Try it

### Memory state

This example updates a state value, observes the notification, then creates a second `Store` with the same persistence to hydrate the value.

<RunnableExample src="packages/store/examples/memory-store" title="Store with MemoryPersistence" />

### Browser persistence targets

`BrowserPersistence` has the same `StatePersistenceInterface<TState>` contract as `MemoryPersistence`. Select `Memory`, `LocalStorage`, `SessionStorage`, or `IndexedDb`; the browser adapter uses the corresponding native API directly.

<RunnableExample src="packages/store/examples/browser-targets" title="One store interface across every browser target" />

The runnable sample writes, hydrates, reports, and clears one counter for every target, so it leaves the browser storage area clean.

## Composition seams

| Surface | Consumer use |
|---|---|
| `StoreInterface<TState>` | Depend on a state container without coupling to a concrete implementation. |
| `StatePersistenceInterface<TState>` | Supply a persistence adapter for another environment or backing service. |
| `StateCodecInterface<TState>` | Validate and serialize persisted values at the storage boundary. |
| `MemoryPersistence<TState>` | Keep transient state in process memory. |
| `BrowserPersistence<TState>` | Persist state through a browser-native target. |
| `StorageTarget` | Select `Memory`, `LocalStorage`, `SessionStorage`, or `IndexedDb`. |

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `Store` | Observable state container with serialized writes. | `@studnicky/store/node` |
| `MemoryPersistence` | In-memory persistence adapter. | `@studnicky/store/node` |
| `JsonStateCodec` | JSON serialization and caller-provided decoded-value validation. | `@studnicky/store/node` |
| `ContextStore` | Resolves one backing store per active Context scope. | `@studnicky/store/node` |
| `StoreInterface` | Store contract for consumer dependencies and composition. | `@studnicky/store/interfaces` |
| `StoreListenerInterface` | Subscriber callback contract for store state updates. | `@studnicky/store/interfaces` |
| `StatePersistenceInterface` | Persistence port implemented by storage adapters. | `@studnicky/store/interfaces` |
| `StateCodecInterface` | Codec contract for persisted values. | `@studnicky/store/interfaces` |
| `ContextStoreOptionsInterface` | Context, storage key, and backing-store factory for ContextStore. | `@studnicky/store/interfaces` |
| `BrowserPersistenceOptionsEntity` | Validates browser persistence target configuration. | `@studnicky/store/entities` |
| `BrowserPersistence` | Browser-native persistence adapter. | `@studnicky/store/browser` |
| `StorageTarget` | Browser persistence target selector. | `@studnicky/store/browser` |

## Layered state

Use [@studnicky/strata-store-kit](/packages/strata-store-kit) to connect a fast in-memory store to a durable browser store while retaining the `StoreInterface<TState>` API.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/store)
