# @studnicky/drilldown

## 15.0.0

### Major Changes

- 91ca066: Every source file reachable from a package's `./browser` export imports its workspace dependencies through their own `/browser` entrypoint rather than `/node`, so a package's browser build no longer pulls in a dependency's Node-only implementation. A package whose `/node` and `/browser` builds previously diverged only by accident of which entrypoint a transitive import happened to resolve to now gets the browser-safe implementation consistently through its whole reachable graph.
- 4d2b2f8: The seven group-value variants (`AlphabeticGroupValueEntity`, `CidrGroupValueEntity`, `DateGroupValueEntity`, `RangeGroupValueEntity`, `SemverGroupValueEntity`, `SequentialGroupValueEntity`, `StringGroupValueEntity`), their `GroupValueEntity` union, and `GroupRuleEntity` are now standalone top-level entities in `packages/drilldown/src/entities/`, each with a real `Schema`/`Node`/`Type`/`validate`/`intake`/`create`, replacing the namespaces previously nested inside `DrilldownRulesEntity`. All nine are exported from the package's public API (`entities/index.js` and the top-level `index.js`), reachable directly — `AlphabeticGroupValueEntity`, not `DrilldownRulesEntity.AlphabeticGroupValueEntity`. Every `rules` field resolves `DrilldownRulesEntity`'s schema by absolute `$id` (`DRILLDOWN_DEFAULTS.drilldownRulesSchemaId`) through a shared `remoteSchemas` map, in place of a same-document `$ref: '#'` that only worked from inside `DrilldownRulesEntity`'s own compiled document.

  `DrillDownConfigEntity`'s `validate`/`intake`/`create` now thread that same `remoteSchemas` map. Previously they did not: `DrillDownConfigEntity`'s `rules` field held an absolute `$ref` to `DrilldownRulesEntity`'s schema with no registry entry to resolve it against, so `DrillDownConfigEntity.intake({'rules': {...}})` threw `Unresolvable reference` for any payload that supplied `rules` — the field the entity exists to carry. Fixed; a regression test now exercises `intake` with real nested `rules` data.

  `DrilldownRulesEntity.Schema`'s own composition of the seven group-value shapes remains a second, hand-maintained copy alongside the new entities' own schemas — a genuine circular module dependency (proven both as a `TS7022` type cycle and, after removing that edge, as a runtime `TypeError` at module evaluation) blocks composing them directly while `EntityCompiler.compile`/`compileIntake`/`compileCreate` run eagerly at module load. Resolves once entity compilation is deferred to first call.

- 4d24d54: Every error a package emits is a named `BaseError` subclass with a stable `code`. Native errors the packages constructed are replaced by named classes in each package's error family; platform and runtime failures (JSON parsing and serialization, `structuredClone`, URL and RegExp construction, `BigInt`, code-point and array-length conversions, `node:fs`, `worker_threads`, fetch and undici, IndexedDB, Web Storage, OPFS, and `node:assert`) are caught at the package boundary and rethrown as named classes with the original as `cause`. Abort reasons created by the packages are named `BaseError` instances. Errors thrown by caller-supplied callbacks, hooks, and reducers propagate unchanged through `CallerFault.propagate` and `CallerFault.rejection` from `@studnicky/types`. `SchemaIntakeError` extends `BaseError`. `@studnicky/eslint-config` ships the opt-in `@studnicky/no-native-error` rule that enforces this contract: native error construction and heritage, non-`BaseError` throws, rejections, and abort reasons, and known-throwing platform calls outside a `try`/`catch`.

### Patch Changes

- Updated dependencies [cf88dc6]
- Updated dependencies [91ca066]
- Updated dependencies [3842ac8]
- Updated dependencies [c91c4eb]
- Updated dependencies [94f3657]
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
- Updated dependencies [1402570]
- Updated dependencies [f820efa]
- Updated dependencies [8e6a261]
- Updated dependencies [1eac93c]
- Updated dependencies [2831589]
- Updated dependencies [3da660e]
- Updated dependencies [543de66]
  - @studnicky/types@15.0.0
  - @studnicky/cache@15.0.0
  - @studnicky/entity@15.0.0

## 14.0.0

### Patch Changes

- Updated dependencies [4d4555f]
  - @studnicky/types@14.0.0
  - @studnicky/cache@14.0.0
  - @studnicky/entity@14.0.0

## 13.0.0

### Patch Changes

- Updated dependencies [95c7c69]
- Updated dependencies [95c7c69]
  - @studnicky/entity@13.0.0
  - @studnicky/cache@13.0.0
  - @studnicky/types@13.0.0

## 12.2.0

### Patch Changes

- @studnicky/cache@12.2.0
  - @studnicky/json@12.2.0
  - @studnicky/types@12.2.0

## 12.1.1

### Patch Changes

- @studnicky/cache@12.1.1
  - @studnicky/json@12.1.1
  - @studnicky/types@12.1.1

## 12.1.0

### Patch Changes

- Updated dependencies [aa12145]
  - @studnicky/types@12.1.0
  - @studnicky/cache@12.1.0
  - @studnicky/json@12.1.0

## 12.0.1

### Patch Changes

- Updated dependencies [ae381ef]
  - @studnicky/types@12.0.1
  - @studnicky/cache@12.0.1
  - @studnicky/json@12.0.1

## 12.0.0

### Patch Changes

- @studnicky/cache@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

## 11.1.0

### Minor Changes

- 44865fd: Adds `@studnicky/drilldown`, a deterministic multi-level grouping, faceting, and sorting engine that discovers filterable/groupable properties from arbitrary record data. Folded in from the standalone `drilldown` repo, updated to build against the current `@studnicky/cache`/`@studnicky/json`/`@studnicky/types` APIs.

### Patch Changes

- Updated dependencies [44865fd]
  - @studnicky/types@11.1.0
  - @studnicky/cache@11.1.0
  - @studnicky/json@11.1.0
