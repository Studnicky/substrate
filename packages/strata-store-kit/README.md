# @studnicky/strata-store-kit

Ordered state layers that propagate source writes to a final consumer-facing store.

[Package guide](https://studnicky.github.io/substrate/packages/strata-store-kit) · [API source](https://github.com/Studnicky/substrate/tree/main/packages/strata-store-kit)

## Install

```bash
pnpm add @studnicky/strata-store-kit @studnicky/store
```

## Runtime imports

| Consumer runtime | Import path |
|---|---|
| Node | `@studnicky/strata-store-kit/node` |
| Browser | `@studnicky/strata-store-kit/browser` |
| Shared contracts | `@studnicky/strata-store-kit/interfaces` |

<details>
<summary>Layered state</summary>

Pass `layers` from source to target. `setState` and `update` enter the source and complete after propagation reaches the target. Reads and subscriptions observe the target.

</details>

<details>
<summary>Durable cache composition</summary>

Combine an in-memory `Store` with a durable store. `hydrate()` reads the final layer and seeds the source so later writes continue through the complete chain. Call `dispose()` when the composition is no longer used.

</details>

<details>
<summary>Mutation coordination</summary>

Supply a shared mutex and `mutexKey` to serialize independent compositions. The pair must differ from every layer's `StoreSynchronizationIdentityInterface`; construction rejects a self-reacquiring lock topology.

</details>

See the [package guide](https://studnicky.github.io/substrate/packages/strata-store-kit) for the runnable browser persistence example and complete API details.
