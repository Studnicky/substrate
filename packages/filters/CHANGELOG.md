# Changelog

## 15.0.2

### Patch Changes

- Updated dependencies [ea9eefe]
  - @studnicky/types@15.0.2
  - @studnicky/entity@15.0.2
  - @studnicky/errors@15.0.2
  - @studnicky/json@15.0.2
  - @studnicky/matching@15.0.2

## 15.0.1

### Patch Changes

- Updated dependencies [3965298]
  - @studnicky/types@15.0.1
  - @studnicky/entity@15.0.1
  - @studnicky/errors@15.0.1
  - @studnicky/json@15.0.1
  - @studnicky/matching@15.0.1

## 15.0.0

### Major Changes

- 91ca066: Every source file reachable from a package's `./browser` export imports its workspace dependencies through their own `/browser` entrypoint rather than `/node`, so a package's browser build no longer pulls in a dependency's Node-only implementation. A package whose `/node` and `/browser` builds previously diverged only by accident of which entrypoint a transitive import happened to resolve to now gets the browser-safe implementation consistently through its whole reachable graph.
- 4d24d54: Every error a package emits is a named `BaseError` subclass with a stable `code`. Native errors the packages constructed are replaced by named classes in each package's error family; platform and runtime failures (JSON parsing and serialization, `structuredClone`, URL and RegExp construction, `BigInt`, code-point and array-length conversions, `node:fs`, `worker_threads`, fetch and undici, IndexedDB, Web Storage, OPFS, and `node:assert`) are caught at the package boundary and rethrown as named classes with the original as `cause`. Abort reasons created by the packages are named `BaseError` instances. Errors thrown by caller-supplied callbacks, hooks, and reducers propagate unchanged through `CallerFault.propagate` and `CallerFault.rejection` from `@studnicky/types`. `SchemaIntakeError` extends `BaseError`. `@studnicky/eslint-config` ships the opt-in `@studnicky/no-native-error` rule that enforces this contract: native error construction and heritage, non-`BaseError` throws, rejections, and abort reasons, and known-throwing platform calls outside a `try`/`catch`.
- b554549: Error and plugin names are declared as literals instead of read from class names, so they survive minification. `BaseError` declares `public abstract override readonly name: string`; every concrete subclass declares `public override readonly name: string = '<ClassName>'`, and a subclass of a concrete error declares its own. `Plugin` declares `protected abstract readonly namespace: string`, and `getNamespace()` returns it as the registry key; every concrete plugin declares `protected override readonly namespace: string = '<PluginName>'`. Assigning `this.name` in a subclass constructor is a type error because `name` is readonly.
- c91c4eb: `DateRangeEntity.create` accepts `DateRangeEntity.InputType` — a plain, unbranded literal — instead of demanding the branded `minimum`/`maximum`-constrained `Type`, which no caller outside the compiler could construct.

### Patch Changes

- Updated dependencies [cf88dc6]
- Updated dependencies [91ca066]
- Updated dependencies [f66779c]
- Updated dependencies [0efeecf]
- Updated dependencies [a664914]
- Updated dependencies [3998901]
- Updated dependencies [91ca066]
- Updated dependencies [6c5051a]
- Updated dependencies [966e1a8]
- Updated dependencies [ebd9f1c]
- Updated dependencies [bb7bb62]
- Updated dependencies [4d24d54]
- Updated dependencies [c91c4eb]
- Updated dependencies [b554549]
- Updated dependencies
- Updated dependencies [1402570]
- Updated dependencies [f820efa]
- Updated dependencies [8e6a261]
- Updated dependencies [1eac93c]
- Updated dependencies [2831589]
- Updated dependencies [a2bd8ca]
- Updated dependencies [5681045]
- Updated dependencies [3da660e]
- Updated dependencies [543de66]
- Updated dependencies [79e33e6]
- Updated dependencies [5374a59]
  - @studnicky/types@15.0.0
  - @studnicky/errors@15.0.0
  - @studnicky/entity@15.0.0
  - @studnicky/json@15.0.0
  - @studnicky/matching@15.0.0

## 14.0.0

### Patch Changes

- Updated dependencies [4d4555f]
  - @studnicky/types@14.0.0
  - @studnicky/entity@14.0.0
  - @studnicky/errors@14.0.0
  - @studnicky/json@14.0.0

## 13.0.0

### Patch Changes

- Updated dependencies [95c7c69]
- Updated dependencies [95c7c69]
  - @studnicky/errors@13.0.0
  - @studnicky/entity@13.0.0
  - @studnicky/json@13.0.0
  - @studnicky/types@13.0.0

## 12.2.0

### Patch Changes

- @studnicky/errors@12.2.0
  - @studnicky/types@12.2.0

## 12.1.1

### Patch Changes

- @studnicky/errors@12.1.1
  - @studnicky/types@12.1.1

## 12.1.0

### Patch Changes

- Updated dependencies [aa12145]
  - @studnicky/types@12.1.0
  - @studnicky/errors@12.1.0

## 12.0.1

### Patch Changes

- Updated dependencies [ae381ef]
  - @studnicky/types@12.0.1
  - @studnicky/errors@12.0.1

## 12.0.0

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/types@12.0.0

## 11.1.0

### Minor Changes

- `@studnicky/filters` provides the declarative filter engine — comparators, operators, logic gates, value coders, and plugin registration — extracted from `@studnicky/types` into its own package.
