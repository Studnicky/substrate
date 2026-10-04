# @studnicky/store

Observable state with persistence adapters and layered composition.

[Package guide](https://studnicky.github.io/substrate/packages/store) · [API source](https://github.com/Studnicky/substrate/tree/main/packages/store)

## Install

```bash
pnpm add @studnicky/store
```

## Runtime imports

| Consumer runtime | Import path |
|---|---|
| Node | `@studnicky/store/node` |
| Browser | `@studnicky/store/browser` |
| Shared entities | `@studnicky/store/entities` |
| Shared contracts | `@studnicky/store/interfaces` |
| Strata on Node | `@studnicky/store/strata` |
| Strata in browsers | `@studnicky/store/strata/browser` |
| Strata contract | `@studnicky/store/strata/interfaces` |

<details>
<summary>Store</summary>

`Store<TState>` persists named state, serializes mutations, and notifies subscribers after a write completes. It copies inputs and persistence values at its boundary, and its reads, updater callbacks, and listeners receive detached immutable snapshots. Use `MemoryPersistence` for transient state or `BrowserPersistence` from the browser entry point for browser storage.

</details>

<details>
<summary>Composition contracts</summary>

Import consumer-facing contracts from `@studnicky/store/interfaces`: `StoreInterface`, `StatePersistenceInterface`, `StateCodecInterface`, and `StoreSynchronizationIdentityInterface`.

</details>

See the [package guide](https://studnicky.github.io/substrate/packages/store) for browser persistence targets, entity-backed codecs, runnable examples, and layered-store usage.
