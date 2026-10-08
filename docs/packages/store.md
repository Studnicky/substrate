---
title: "@studnicky/store"
description: Observable browser-ready state stores with interchangeable persistence.
---

# @studnicky/store

> Keep application state observable while selecting an in-memory or browser-native persistence target.

## Install

```bash
pnpm add @studnicky/store
```

## Runtime imports

Import runtime APIs from `@studnicky/store/node` in Node or `@studnicky/store/browser` in browsers. Import normalized entity facilities from the neutral `@studnicky/store/entity` path, persistence configuration entities from `@studnicky/store/entities`, and contracts from `@studnicky/store/interfaces`. Import the layered Node composition from `@studnicky/store/strata`, its browser runtime from `@studnicky/store/strata/browser`, and its contract from `@studnicky/store/strata/interfaces`.

## Northstar Books checkout state

Northstar Books gives a shopper an immediate cart and checkout-progress view while keeping a durable recovery point. A `StrataStore` from `@studnicky/store/strata` places the fast working store before the durable browser store: a committed write propagates source-to-target, and `hydrate()` restores the durable checkout snapshot back through the layers after a reload.

The guarantee is that subscribers receive committed, detached snapshots only after persistence succeeds, while matching store keys serialize local writes. The composition does not make browser storage a shared transaction coordinator; multiple tabs or server instances require a durable persistence implementation with the coordination semantics the application needs.

## Core store

A Northstar Books shopper's cart is just one named value — the list of ISBNs in it — and `Store<TState>` exists to hold exactly that kind of single, observable piece of state. `setState` and `update` persist before notifying subscribers, `hydrate` restores the named value, and `clear` removes it before publishing the initial state again. Below, one store adds a book to the cart and its subscriber is notified only once that write has actually persisted; a second `Store` pointed at the same key and persistence then hydrates and recovers the identical cart, proving the state survives past the original store instance. Store copies initial state, mutation inputs, and persistence values at its boundary, and `getSnapshot`, updater callbacks, and subscribers all receive detached immutable snapshots — return a new value from `update` instead of changing its snapshot.

<<< ../../packages/store/examples/memory-store.ts#usage

## Normalized entity state

`@studnicky/store/entity` exports `EntityCollection`, `EntityStore`, `EntityStateInterface`, and `EntityStoreOptionsInterface`. This is the only entity-store import path.

`EntityStateInterface<TEntity>` is normalized JSON-safe state: an `entities` record keyed by string ID and an ordered `ids` array. When a JSON codec persists the state, choose an entity type whose fields are JSON-safe. `EntityCollection` supplies the pure normalized-state transformations and selectors.

`EntityStore<TEntity>` is an entity-oriented facade over a caller-provided `StoreInterface<EntityStateInterface<TEntity>>`. It delegates mutation and subscription to that store, so a generic `Store` or `StrataStore` supplies persistence, mutex coordination, hydration, snapshots, and subscriptions. The facade owns none of those mechanisms independently; call lifecycle methods such as `hydrate` and `clear` on the backing store.

## Shared mutation coordination

Pass the same `MutexInterface<string>` to independent stores that write the same persistence key. `Store` uses its existing `key` as the mutex key, so equal store keys serialize while different keys continue independently. Import the concrete mutex from `@studnicky/concurrency/mutex` and the contract from `@studnicky/concurrency/interfaces`.

<!-- inline-ts-ok: Independent Store instances coordinate writes through a canonical Mutex. -->

```typescript
import { Mutex } from "@studnicky/concurrency/mutex";
import { Store } from "@studnicky/store/node";
import type { MutexInterface } from "@studnicky/concurrency/interfaces";

const mutex: MutexInterface<string> = Mutex.create<string>();
const first = Store.create({ initialState: 0, key: "cart", mutex, persistence });
const second = Store.create({ initialState: 0, key: "cart", mutex, persistence });
```

A layered composition uses a distinct mutex and key pair from every layer. `StoreInterface` implementations provide `getSynchronizationIdentity()` for this composition contract.

## Strata

`StrataStore<TState>` composes stores from source to target. Consumer writes enter the source and propagate through every layer before they resolve. Reads and subscriptions observe the target.

`hydrate()` restores the target, then seeds the source so the value propagates across the chain. `clear()` clears every layer, and `dispose()` releases the propagation subscriptions.

Keep a Northstar Books shopper's checkout cart quantity snappy with an in-memory cache in front, while a durable `localStorage` layer behind it survives a page reload. `StrataStore` composes exactly that: writes enter at the cache and propagate down to the durable layer before they resolve, while reads and subscriptions watch the far end of the chain. The example below seeds the durable layer directly, hydrates the composed store back through both layers, then pushes an update and confirms the cache, the composed store, and the durable target all agree on the final quantity — before cleaning up with `clear()` and `dispose()`. Pass a shared `MutexInterface<string>` and matching `mutexKey` to coordinate independent strata; the pair differs from every layer synchronization identity, and construction rejects a layer that would reacquire the composition lock.

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

## Try it

### Memory state

Run the same cart scenario live: watch the update land, the subscriber fire, and a freshly created `Store` pull the identical cart back out through `hydrate()`.

<RunnableExample src="packages/store/examples/memory-store" title="Store with MemoryPersistence" />

### Browser persistence targets

Northstar Books might want a shopper's filter choice to disappear the moment the tab closes, or a checkout draft to survive a browser restart — different durability for different needs, through the exact same `Store` interface. This demo loops through all four targets — memory, local storage, session storage, and IndexedDB — writing, hydrating fresh, and clearing each one in turn, so you can see one consistent contract sitting on top of four genuinely different native browser APIs. `BrowserPersistence` shares the same `StatePersistenceInterface<TState>` contract as `MemoryPersistence`; the browser adapter uses the corresponding native API directly for whichever target is selected.

<RunnableExample src="packages/store/examples/browser-targets" title="One store interface across every browser target" />

The runnable sample writes, hydrates, reports, and clears one counter for every target, so it leaves the browser storage area clean.

## Composition seams

| Surface                                 | Consumer use                                                               |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `StoreInterface<TState>`                | Depend on a state container without coupling to a concrete implementation. |
| `StoreSynchronizationIdentityInterface` | Expose the mutex and key that serialize a store's mutations.               |
| `StatePersistenceInterface<TState>`     | Supply a persistence adapter for another environment or backing service.   |
| `StateCodecInterface<TState>`           | Validate and serialize persisted values at the storage boundary.           |
| `MemoryPersistence<TState>`             | Keep transient state in process memory.                                    |
| `BrowserPersistence<TState>`            | Persist state through a browser-native target.                             |
| `StorageTarget`                         | Select `Memory`, `LocalStorage`, `SessionStorage`, or `IndexedDb`.         |

The same runtime symbols are available from `@studnicky/store/browser`; select the entry point for the active runtime.

## What it is

`@studnicky/store` is an observable state and persistence-composition primitive. It provides a generic store, normalized entity facade, codecs, browser persistence, and ordered store layering; it does not provide a checkout, catalogue, entity product, or cross-tab transaction coordinator.

## What it is for

Northstar Books composes a `Store` with the persistence and synchronization semantics appropriate for cart, checkout, or bookseller interface state. It uses the entity subpath only for normalized records over a backing store, and `strata` only to layer stores from a fast source to a durable target. Node and browser are runtime-specific alternatives; entities validate persistence configuration and interfaces define injectable composition seams.

## Northstar Books examples

- **Memory cache → localStorage → consumer** solves the “keep a shopper’s cart responsive while retaining it across a reload” problem. It layers a fast memory store ahead of browser storage, proving that writes propagate and hydration restores the durable snapshot through Northstar’s chosen layers.
- **Store with MemoryPersistence** solves the “hold transient bookseller filter state with observable updates” problem. It updates, observes, and hydrates one named state value, proving that persistence completes before subscribers receive detached snapshots.
- **One store interface across every browser target** solves the “choose the browser durability appropriate to a checkout draft” problem. It exercises memory, local storage, session storage, and IndexedDB through one store contract, proving that Northstar can change the backing target without changing the consuming state port.

## Public entrypoints

| Import path                          | Use it when                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `@studnicky/store/node`              | Northstar creates a server-side observable store, memory persistence, or JSON state codec.               |
| `@studnicky/store/browser`           | Northstar persists reader or bookseller state through a browser-native target.                           |
| `@studnicky/store/interfaces`        | Northstar accepts a store, persistence, codec, listener, or synchronization identity through a contract. |
| `@studnicky/store/entities`          | Northstar validates browser-persistence configuration at the storage boundary.                           |
| `@studnicky/store/entity`            | Northstar composes normalized book records over its own generic backing store.                           |
| `@studnicky/store/strata`            | Northstar layers fast and durable stores for a state flow it owns.                                       |
| `@studnicky/store/strata/browser`    | Northstar uses the browser-safe runtime surface of ordered store layering.                               |
| `@studnicky/store/strata/interfaces` | Northstar defines strata composition options and ports without selecting layer implementations.          |

## Exports

| Symbol                            | Purpose                                                                                         | Import path                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| `EntityCollection`                | Pure normalized entity-state transformations and selectors.                                     | `@studnicky/store/entity`            |
| `EntityStateInterface`            | JSON-safe normalized entity record and ordered ID state.                                        | `@studnicky/store/entity`            |
| `EntityStore`                     | Entity facade composed over a caller-provided StoreInterface.                                   | `@studnicky/store/entity`            |
| `EntityStoreOptionsInterface`     | Entity selector, optional ordering, and backing StoreInterface contract.                        | `@studnicky/store/entity`            |
| `Store`                           | Observable state container with serialized writes.                                              | `@studnicky/store/node`              |
| `StrataStore`                     | Ordered source-to-target store composition.                                                     | `@studnicky/store/strata`            |
| `StrataStoreOptionsInterface`     | Source-to-target layers and optional composition coordination.                                  | `@studnicky/store/strata/interfaces` |
| `MemoryPersistence`               | In-memory persistence adapter.                                                                  | `@studnicky/store/node`              |
| `JsonStateCodec`                  | JSON serialization with direct entity intake or a caller-provided typed decoder.                | `@studnicky/store/node`              |
| `StoreInterface`                  | Store contract for consumer dependencies and composition.                                       | `@studnicky/store/interfaces`        |
| `StoreListenerInterface`          | Subscriber callback contract for store state updates.                                           | `@studnicky/store/interfaces`        |
| `StatePersistenceInterface`       | Persistence port implemented by storage adapters.                                               | `@studnicky/store/interfaces`        |
| `StateCodecInterface`             | Codec contract for persisted values.                                                            | `@studnicky/store/interfaces`        |
| `BrowserPersistenceOptionsEntity` | Validates browser persistence target configuration.                                             | `@studnicky/store/entities`          |
| `BrowserPersistence`              | Browser-native persistence adapter.                                                             | `@studnicky/store/browser`           |
| `StorageTarget`                   | Browser persistence target selector.                                                            | `@studnicky/store/browser`           |
| `StoreError`                      | Abstract base of every store error.                                                             | `@studnicky/store/node`              |
| `BrowserStorageError`             | Web Storage access or an operation on it failed; the platform error is the `cause`.             | `@studnicky/store/node`              |
| `IndexedDbEntryError`             | An IndexedDB state entry is not a serialized string.                                            | `@studnicky/store/node`              |
| `IndexedDbError`                  | An IndexedDB open, transaction, or request failed; the platform error is the `cause`.           | `@studnicky/store/node`              |
| `IndexedDbUnavailableError`       | IndexedDB persistence is selected in a runtime without IndexedDB.                               | `@studnicky/store/node`              |
| `StateDecodeError`                | Serialized state is not valid JSON; the platform `SyntaxError` is the `cause`.                  | `@studnicky/store/node`              |
| `StateEncodeError`                | State cannot be serialized to a JSON string.                                                    | `@studnicky/store/node`              |
| `StoreListenerMutationError`      | A Store mutation is requested from inside a Store listener.                                     | `@studnicky/store/node`              |
| `StrataLayerUnavailableError`     | A StrataStore cannot resolve one of its layers.                                                 | `@studnicky/store/strata`            |
| `StrataStoreOptionsError`         | `StrataStore.create` received layers or a mutex identity that violate the composition contract. | `@studnicky/store/strata`            |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/store)
