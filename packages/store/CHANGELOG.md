# @studnicky/store

## 15.0.1

### Patch Changes

- Updated dependencies [3965298]
  - @studnicky/types@15.0.1
  - @studnicky/concurrency@15.0.1
  - @studnicky/entity@15.0.1
  - @studnicky/json@15.0.1

## 15.0.0

### Major Changes

- 4d24d54: Every error a package emits is a named `BaseError` subclass with a stable `code`. Native errors the packages constructed are replaced by named classes in each package's error family; platform and runtime failures (JSON parsing and serialization, `structuredClone`, URL and RegExp construction, `BigInt`, code-point and array-length conversions, `node:fs`, `worker_threads`, fetch and undici, IndexedDB, Web Storage, OPFS, and `node:assert`) are caught at the package boundary and rethrown as named classes with the original as `cause`. Abort reasons created by the packages are named `BaseError` instances. Errors thrown by caller-supplied callbacks, hooks, and reducers propagate unchanged through `CallerFault.propagate` and `CallerFault.rejection` from `@studnicky/types`. `SchemaIntakeError` extends `BaseError`. `@studnicky/eslint-config` ships the opt-in `@studnicky/no-native-error` rule that enforces this contract: native error construction and heritage, non-`BaseError` throws, rejections, and abort reasons, and known-throwing platform calls outside a `try`/`catch`.

### Patch Changes

- Updated dependencies [cf88dc6]
- Updated dependencies [91ca066]
- Updated dependencies [bbf4a5a]
- Updated dependencies [1f55f81]
- Updated dependencies [59e5a5b]
- Updated dependencies [94f3657]
- Updated dependencies [c50bd4e]
- Updated dependencies [0efeecf]
- Updated dependencies [a664914]
- Updated dependencies [3998901]
- Updated dependencies [91ca066]
- Updated dependencies [6c5051a]
- Updated dependencies [966e1a8]
- Updated dependencies [ebd9f1c]
- Updated dependencies [bb7bb62]
- Updated dependencies [4d24d54]
- Updated dependencies
- Updated dependencies [4c71e9b]
- Updated dependencies [420bdb5]
- Updated dependencies [c91c4eb]
- Updated dependencies [1402570]
- Updated dependencies [f820efa]
- Updated dependencies [8e6a261]
- Updated dependencies [1eac93c]
- Updated dependencies [2831589]
- Updated dependencies [a2bd8ca]
- Updated dependencies [3da660e]
- Updated dependencies [543de66]
  - @studnicky/types@15.0.0
  - @studnicky/context@15.0.0
  - @studnicky/entity@15.0.0
  - @studnicky/json@15.0.0
  - @studnicky/mutex@15.0.0

## 14.0.0

### Major Changes

- 06e7613: Composable concurrency controls, typed operation pipelines, coordinated stores, and resilience rate limiting provide matching `/node` and `/browser` runtime contracts with neutral `/entities` and `/interfaces` declarations. `@studnicky/resilience` provides sliding-window limiting alongside its resilience controls.

### Patch Changes

- Updated dependencies [06e7613]
  - @studnicky/mutex@14.0.0
  - @studnicky/context@14.0.0
  - @studnicky/entity@14.0.0
  - @studnicky/json@14.0.0

## 13.0.0

### Patch Changes

- Updated dependencies [67a740c]
- Updated dependencies [95c7c69]
- Updated dependencies [95c7c69]
  - @studnicky/context@13.0.0
  - @studnicky/entity@13.0.0
  - @studnicky/json@13.0.0
  - @studnicky/mutex@13.0.0

## 12.2.0

### Patch Changes

- @studnicky/json@12.2.0
  - @studnicky/mutex@12.2.0

## 12.1.1

### Patch Changes

- @studnicky/json@12.1.1
  - @studnicky/mutex@12.1.1

## 12.1.0

### Patch Changes

- @studnicky/json@12.1.0
  - @studnicky/mutex@12.1.0
