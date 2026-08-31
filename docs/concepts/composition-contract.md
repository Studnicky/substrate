---
title: Composition Contract
description: The public construction, lifecycle, export, and platform-parity rules shared by Substrate packages.
---

# Composition Contract

Substrate packages compose through explicit public contracts. A package owns one behavior; a
composition package owns the order, failure handling, or aggregation that connects focused
behaviors. Neither layer proxies another package's API.

## Consumer model

<!-- inline-ts-ok: The contract defines a package-agnostic construction pattern. -->
```typescript
const primitive = Primitive.create(options);

const kit = Kit.create({
  primitive,
  ...options
});

const adapter = BrowserAdapter.create(options);

const composition = Composition.create({
  layers: [memoryStore, durableStore]
});
```

Stateful primitives, adapters, and kits construct through `Class.create(options)`. The factory
owns validation, defaults, and dependency resolution. A composition option accepts either a
prebuilt dependency or the option object for that dependency's factory. Pure immutable values do
not gain factories merely to resemble stateful modules.

## Public entrypoints

| Entrypoint | Contract |
|---|---|
| `@studnicky/package` | Portable API, or the sole API for an explicitly single-runtime package. |
| `@studnicky/package/interfaces` | Consumer substitution contracts. |
| `@studnicky/package/entities` | Canonical structured data and validation boundaries. |
| `@studnicky/package/browser` | Browser-native implementation of a portable contract. |
| `@studnicky/package/node` | Node-native implementation of a portable contract. |

A package that declares browser support keeps Node built-ins out of its root and browser
entrypoints. A browser adapter implements the same portable interface as its Node peer. Platform
capabilities without an equivalent semantic remain on the platform entrypoint rather than leaking
into the portable interface.

## Composition rules

1. A primitive owns its direct operation and state.
2. A kit accepts public dependency contracts or their option objects.
3. A kit documents its fixed execution order where ordering changes behavior.
4. A composition retains private ownership of dependencies it creates.
5. Consumers retain access to dependencies they inject; a composition does not proxy dependency
   APIs.
6. A composition implements the contract of the layer it composes when that contract exists.

For example, `BoundaryKit` owns `throttle → circuit breaker → retry → callback` ordering.
`StrataStore` owns lower-to-higher store propagation while itself implementing
`StoreInterface<TState>`.

## Lifecycle contract

| Method | Meaning |
|---|---|
| `start()` | Begin a restartable process. |
| `stop()` | Halt a restartable in-memory process. |
| `close()` | Permanently release a service or runtime resource. |
| `dispose()` | Detach listeners or composition wiring owned by the instance. |
| `clear()` | Reset stored data without destroying the instance. |

## Observation contract

| Mechanism | Use |
|---|---|
| Protected lifecycle hook | Primitive-level tracing, metrics, and subclass extension. |
| Event bus | Explicit domain or operational events. |
| `subscribe()` | Current state snapshots only. |

These mechanisms are intentionally distinct. A module does not add another observation API when
one already expresses the required semantic.

## Platform parity

Platform parity has five requirements:

1. **Type parity:** both implementations satisfy the same public interface.
2. **Behavior parity:** equivalent operations share result, error, ordering, cancellation, and
   lifecycle semantics.
3. **Construction parity:** consumers configure comparable implementations in the same way.
4. **Export parity:** portable and platform entrypoints have consistent meanings.
5. **Composition parity:** portable kits import portable public surfaces only.

Each portable interface has a shared contract suite. The suite runs against every platform
implementation, while platform-specific tests cover native behavior that the portable contract
does not expose.

## Package registry

The [package registry](/concepts/package-registry) records the classification, public surface,
runtime declaration, and parity test status for every workspace package. New packages enter the
registry before implementation begins.
