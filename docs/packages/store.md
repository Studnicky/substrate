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

Import runtime APIs from `@studnicky/store/node` in Node or `@studnicky/store/browser` in browsers. Import entities and contracts from the neutral `@studnicky/store/entities` and `@studnicky/store/interfaces` paths. Import the layered Node composition from `@studnicky/store/strata`, its browser runtime from `@studnicky/store/strata/browser`, and its contract from `@studnicky/store/strata/interfaces`.

## Northstar Books checkout state

Northstar Books gives a shopper an immediate cart and checkout-progress view while keeping a durable recovery point. A `StrataStore` from `@studnicky/store/strata` places the fast working store before the durable browser store: a committed write propagates source-to-target, and `hydrate()` restores the durable checkout snapshot back through the layers after a reload.

The guarantee is that subscribers receive committed, detached snapshots only after persistence succeeds, while matching store keys serialize local writes. The composition does not make browser storage a shared transaction coordinator; multiple tabs or server instances require a durable persistence implementation with the coordination semantics the application needs.

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

## Strata

`StrataStore<TState>` composes stores from source to target. Consumer writes enter the source and propagate through every layer before they resolve. Reads and subscriptions observe the target.

`hydrate()` restores the target, then seeds the source so the value propagates across the chain. `clear()` clears every layer, and `dispose()` releases the propagation subscriptions.

Pass a shared `MutexInterface<string>` and matching `mutexKey` to coordinate independent strata. The pair differs from every layer synchronization identity; construction rejects a layer that would reacquire the composition lock.

<RunnableExample src="packages/store/examples/layered-browser-store" title="Memory cache → localStorage → consumer" />

<<< ../../packages/store/examples/layered-browser-store.ts#usage

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
| `StrataStore` | Ordered source-to-target store composition. | `@studnicky/store/strata` |
| `StrataStoreOptionsInterface` | Source-to-target layers and optional composition coordination. | `@studnicky/store/strata/interfaces` |
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
| `StoreError` | Abstract base of every store error. | `@studnicky/store/node` |
| `BrowserStorageError` | Web Storage access or an operation on it failed; the platform error is the `cause`. | `@studnicky/store/node` |
| `ContextScopeInactiveError` | A ContextStore is used outside an active Context scope. | `@studnicky/store/node` |
| `ContextStoreFactoryError` | A ContextStore factory returned a value that is not a `StoreInterface`. | `@studnicky/store/node` |
| `ContextStoreKeyConflictError` | The Context key of a ContextStore holds a value that is not one of its stores. | `@studnicky/store/node` |
| `ContextStoreOptionsError` | `ContextStore.create` received invalid options. | `@studnicky/store/node` |
| `IndexedDbEntryError` | An IndexedDB state entry is not a serialized string. | `@studnicky/store/node` |
| `IndexedDbError` | An IndexedDB open, transaction, or request failed; the platform error is the `cause`. | `@studnicky/store/node` |
| `IndexedDbUnavailableError` | IndexedDB persistence is selected in a runtime without IndexedDB. | `@studnicky/store/node` |
| `StateDecodeError` | Serialized state is not valid JSON; the platform `SyntaxError` is the `cause`. | `@studnicky/store/node` |
| `StateEncodeError` | State cannot be serialized to a JSON string. | `@studnicky/store/node` |
| `StoreListenerMutationError` | A Store mutation is requested from inside a Store listener. | `@studnicky/store/node` |
| `SynchronizationIdentityMismatchError` | A ContextStore backing store reports a different synchronization identity. | `@studnicky/store/node` |
| `StrataLayerUnavailableError` | A StrataStore cannot resolve one of its layers. | `@studnicky/store/strata` |
| `StrataStoreOptionsError` | `StrataStore.create` received layers or a mutex identity that violate the composition contract. | `@studnicky/store/strata` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/store)
