---
"@studnicky/cache": major
"@studnicky/circular-buffer": major
"@studnicky/clock": major
"@studnicky/concurrency": major
"@studnicky/config": major
"@studnicky/context": major
"@studnicky/drilldown": major
"@studnicky/entity": major
"@studnicky/errors": major
"@studnicky/event-bus": major
"@studnicky/fetch": major
"@studnicky/filters": major
"@studnicky/fsm": major
"@studnicky/json": major
"@studnicky/logger": major
"@studnicky/matching": major
"@studnicky/pipeline": major
"@studnicky/resilience": major
"@studnicky/scheduler": major
"@studnicky/signal": major
"@studnicky/store": major
"@studnicky/types": major
"@studnicky/virtual-fs": major
"@studnicky/visible-range": major
"@studnicky/eslint-config": minor
---

Every error a package emits is a named `BaseError` subclass with a stable `code`. Native errors the packages constructed are replaced by named classes in each package's error family; platform and runtime failures (JSON parsing and serialization, `structuredClone`, URL and RegExp construction, `BigInt`, code-point and array-length conversions, `node:fs`, `worker_threads`, fetch and undici, IndexedDB, Web Storage, OPFS, and `node:assert`) are caught at the package boundary and rethrown as named classes with the original as `cause`. Abort reasons created by the packages are named `BaseError` instances. Errors thrown by caller-supplied callbacks, hooks, and reducers propagate unchanged through `CallerFault.propagate` and `CallerFault.rejection` from `@studnicky/types`. `SchemaIntakeError` extends `BaseError`. `@studnicky/eslint-config` ships the opt-in `@studnicky/no-native-error` rule that enforces this contract: native error construction and heritage, non-`BaseError` throws, rejections, and abort reasons, and known-throwing platform calls outside a `try`/`catch`.
