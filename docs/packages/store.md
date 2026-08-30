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
| `Store` | Observable state container with serialized writes. | `@studnicky/store` |
| `MemoryPersistence` | In-memory persistence adapter. | `@studnicky/store` |
| `JsonStateCodec` | JSON serialization and caller-provided decoded-value validation. | `@studnicky/store` |
| `StoreInterface` | Store contract for consumer dependencies and composition. | `@studnicky/store` |
| `StoreListenerInterface` | Subscriber callback contract for store state updates. | `@studnicky/store` |
| `StatePersistenceInterface` | Persistence port implemented by storage adapters. | `@studnicky/store` |
| `StateCodecInterface` | Codec contract for persisted values. | `@studnicky/store` |
| `BrowserPersistence` | Browser-native persistence adapter. | `@studnicky/store/browser` |
| `StorageTarget` | Browser persistence target selector. | `@studnicky/store/browser` |

## Layered state

Use [@studnicky/strata-store-kit](/packages/strata-store-kit) to connect a fast in-memory store to a durable browser store while retaining the `StoreInterface<TState>` API.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/store)
