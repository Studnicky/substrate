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

## Runtime imports

Import runtime APIs from `@studnicky/store/node` in Node or `@studnicky/store/browser` in browsers. Import entities and contracts from the neutral `@studnicky/store/entities` and `@studnicky/store/interfaces` paths.

## Core store

`Store<TState>` owns one named state value. `setState` and `update` persist before notifying subscribers; `hydrate` restores the named value; and `clear` removes it before publishing the initial state. Store copies initial state, mutation inputs, and persistence values at its boundary. `getSnapshot`, updater callbacks, and subscribers receive detached immutable snapshots; return a new value from `update` instead of changing its snapshot.

<<< ../../packages/store/examples/memory-store.ts#usage

## Shared mutation coordination

Pass the same `MutexInterface<string>` to independent stores that write the same persistence key. `Store` uses its existing `key` as the mutex key, so equal store keys serialize while different keys continue independently. Import the concrete mutex from the runtime entry point and the contract from the neutral interfaces entry point.

<!-- inline-ts-ok: Independent Store instances coordinate writes through a canonical Mutex. -->
```typescript
import { Mutex } from "@studnicky/mutex/node";
import { Store } from "@studnicky/store/node";
import type { MutexInterface } from "@studnicky/mutex/interfaces";

const mutex: MutexInterface<string> = Mutex.create<string>();
const first = Store.create({ initialState: 0, key: "cart", mutex, persistence });
const second = Store.create({ initialState: 0, key: "cart", mutex, persistence });
```

A layered composition uses a distinct mutex and key pair from every layer. `StoreInterface` implementations provide `getSynchronizationIdentity()` for this composition contract.

## Entity-backed persistence

Bind JSON storage directly to the entity that owns the persisted shape. `JsonStateCodec.fromEntity` parses the storage string and passes the resulting unknown value to the entity intake exactly once.

<!-- inline-ts-ok: Consumer persistence composition through the browser runtime entry point. -->
```typescript
import { BrowserPersistence, JsonStateCodec, StorageTarget } from "@studnicky/store/browser";

import { CartEntity } from "./CartEntity.js";

const persistence = BrowserPersistence.create({
  codec: JsonStateCodec.fromEntity(CartEntity.intake),
  storageTarget: StorageTarget.LocalStorage,
});
```

Use `JsonStateCodec.create({ decode })` only when the state is not a JSON entity and its domain supplies a different typed decoder.

## Context-scoped state

`ContextStore` is available from both runtime entry points and resolves one backing `Store` per active `Context` scope. It implements `StoreInterface<TState>`, so one long-lived `StrataStore` can relay every scope's updates to a durable layer. Supply its stable `synchronizationIdentity`; every backing Store is checked against it when that scope first uses the ContextStore.

<!-- inline-ts-ok: Consumer composition example showing the published Node runtime and neutral interface imports. -->
```typescript
import { Context } from '@studnicky/context/node';
import { Mutex } from '@studnicky/mutex/node';
import { ContextStore, MemoryPersistence, Store } from '@studnicky/store/node';
import type { ContextStoreOptionsInterface } from '@studnicky/store/interfaces';

const context = Context.create({ name: 'request' });
const mutex = Mutex.create<string>();
const options: ContextStoreOptionsInterface<{ readonly items: string[] }> = {
  context,
  key: 'request.cart',
  synchronizationIdentity: { key: 'request.cart', mutex },
  createStore: () => Store.create({
    initialState: { items: [] },
    key: 'request.cart',
    mutex,
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
| `StoreSynchronizationIdentityInterface` | Expose the mutex and key that serialize a store's mutations. |
| `StatePersistenceInterface<TState>` | Supply a persistence adapter for another environment or backing service. |
| `StateCodecInterface<TState>` | Validate and serialize persisted values at the storage boundary. |
| `MemoryPersistence<TState>` | Keep transient state in process memory. |
| `BrowserPersistence<TState>` | Persist state through a browser-native target. |
| `StorageTarget` | Select `Memory`, `LocalStorage`, `SessionStorage`, or `IndexedDb`. |

The same runtime symbols are available from `@studnicky/store/browser`; select the entry point for the active runtime.

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `Store` | Observable state container with serialized writes. | `@studnicky/store/node` |
| `MemoryPersistence` | In-memory persistence adapter. | `@studnicky/store/node` |
| `JsonStateCodec` | JSON serialization with direct entity intake or a caller-provided typed decoder. | `@studnicky/store/node` |
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
