# @studnicky/example-smoke-kit

## 15.0.0

### Major Changes

- 4d24d54: Every error a package emits is a named `BaseError` subclass with a stable `code`. Native errors the packages constructed are replaced by named classes in each package's error family; platform and runtime failures (JSON parsing and serialization, `structuredClone`, URL and RegExp construction, `BigInt`, code-point and array-length conversions, `node:fs`, `worker_threads`, fetch and undici, IndexedDB, Web Storage, OPFS, and `node:assert`) are caught at the package boundary and rethrown as named classes with the original as `cause`. Abort reasons created by the packages are named `BaseError` instances. Errors thrown by caller-supplied callbacks, hooks, and reducers propagate unchanged through `CallerFault.propagate` and `CallerFault.rejection` from `@studnicky/types`. `SchemaIntakeError` extends `BaseError`. `@studnicky/eslint-config` ships the opt-in `@studnicky/no-native-error` rule that enforces this contract: native error construction and heritage, non-`BaseError` throws, rejections, and abort reasons, and known-throwing platform calls outside a `try`/`catch`.

### Patch Changes

- b06e287: Both packages gain a documentation page, `examples/` coverage, and a `tests/smoke` suite. `example-smoke-kit` self-hosts its own smoke suite through `ExampleSmokeRunner`; `scenario-kit` documents the `Schema`/`Node` agreement `compileIntake` enforces before compiling either side.
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
- Updated dependencies [5681045]
- Updated dependencies [3da660e]
- Updated dependencies [543de66]
- Updated dependencies [79e33e6]
- Updated dependencies [5374a59]
  - @studnicky/types@15.0.0
  - @studnicky/errors@15.0.0
  - @studnicky/entity@15.0.0
