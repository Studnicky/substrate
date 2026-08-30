---
title: '@studnicky/strata-store-kit'
description: Compose stores into a layered cache and durable persistence flow.
---

# @studnicky/strata-store-kit

> Compose state stores into an ordered flow that propagates a source update through every higher store.

## Install

```bash
pnpm add @studnicky/strata-store-kit @studnicky/store
```

## Layer order

`StrataStore<TState>` accepts stores from source to target. Consumer writes enter the first store; every update then propagates to the next store before the write resolves. Reads and subscriptions observe the final store.

```text
setState / update
        │
        ▼
MemoryPersistence ───► LocalStorage ───► consumer snapshot
```

`hydrate()` restores the final durable store, then seeds the source store with that value. The source update propagates through the full chain, leaving the cache and durable state aligned for the next update. `clear()` removes the named value from every layer. Call `dispose()` when the composition no longer owns its subscriptions.

## Try it

The complete example seeds a local-storage counter as if it came from an earlier browser session, creates an in-memory cache plus durable store, hydrates the composition, applies an update, and prints the cache, durable, and consumer snapshots. It clears the demo state and disposes its subscriptions after the run.

<RunnableExample src="packages/strata-store-kit/examples/layered-browser-store" title="Memory cache → localStorage → consumer" />

## Usage

<<< ../../packages/strata-store-kit/examples/layered-browser-store.ts#usage

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `StrataStore` | Ordered store composition that implements `StoreInterface<TState>`. | `@studnicky/strata-store-kit` |
| `StrataStoreOptionsInterface<TState>` | Construction options containing source-to-target `layers`. | `@studnicky/strata-store-kit` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/strata-store-kit)
