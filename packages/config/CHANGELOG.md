# Changelog

## 11.0.1

### Patch Changes

- 92e7c65: Adds missing `tsconfig.json` project references for `@studnicky/*` dependencies declared in
  `package.json` but absent from `references`, the same class of bug that broke `intake-kit`'s
  `tsc -b` build order. Found by auditing every package for this pattern after the intake-kit
  incident; these 26 packages were latent, not yet triggering a build failure.
- @studnicky/errors@11.0.1
  - @studnicky/json@11.0.1
  - @studnicky/types@11.0.1

## 11.0.0

### Major Changes

- d05cb42: `@studnicky/predicates`, `Guard`, and the atomic comparators are absorbed into
  `@studnicky/types`' `Predicates`; `@studnicky/types/filters` is redesigned around a
  callable/value union rather than per-collection operator modules, dropping the standalone
  `ArrayOperators`/`MapOperators`/`SetOperators` exports. Every package's `interfaces/`,
  `entities/`, and `errors/` now export through their own submodule instead of the package
  root. `SchemaValidator.compileIntake` and `@studnicky/intake-kit`'s `IntakeCompiler`/
  `EntityIntake` no longer coerce a scalar's type at the boundary — a wrong-typed field is
  rejected, not silently converted, and the `coerce` option is removed entirely so every
  `@studnicky/*` package now shares one strict intake contract.
  
  `@studnicky/eslint-config` rule behaviour is now derived from measurement rather than
  assumption, abbreviated exported identifiers are expanded across every rule, `hygieneSuite`
  and the `HexagonalSuite` factory are added alongside the existing `entitySuite`/`v8Suite`,
  and several rules that were defined but never enabled (`no-mixed-callable-shapes`, four
  `arch/*` rules, `descriptive-identifiers`) are now wired into the shipped configuration.

### Patch Changes

- Updated dependencies [d05cb42]
  - @studnicky/errors@11.0.0
  - @studnicky/json@11.0.0
  - @studnicky/types@11.0.0

## 10.0.0

### Patch Changes

- Updated dependencies [3e5575a]
  - @studnicky/errors@10.0.0
  - @studnicky/json@10.0.0
  - @studnicky/types@10.0.0

## 9.2.0

### Patch Changes

- Version bump only — no functional changes. Released in lockstep with the fixed-package group.

## 9.1.1

### Patch Changes

- @studnicky/errors@9.1.1
- @studnicky/json@9.1.1
- @studnicky/types@9.1.1

## 9.1.0

### Patch Changes

- 789da06: ### Changed

  - `@studnicky/clock`'s `Clock.scenarios.json` suite derives `long-uptime-precision`'s expected nanosecond value independently of `RealTimeClockProvider.hrtime()`'s internal trunc/multiply/round split, asserts both bounds around `Date.now()` for `real-provider-default-options`, reads the `offsetMs` getter from a subclass in `offset-provider-offset`, and asserts the actual offset-to-nanosecond relationship (rather than bare positivity) in `real-hrtime-positive-with-offset`/`-zero-offset`. Its smoke suite drops a tautological assertion that compared a fixture field to a hardcoded literal ahead of the real import check.
  - `@studnicky/types`' `Guard.asNumber` scenarios cover the NaN-passthrough asymmetry with `Guard.isNumber` (which excludes NaN). Its smoke suite drops the same tautological assertion.
  - `@studnicky/config`'s `Guard.isObject` scenarios cover `Map` and `Set` inputs, matching the documented plain-object exclusion. Its smoke suite drops the same tautological assertion.
  - `@studnicky/signal`'s `Signal.scenarios.json` suite drops four tautological assertions that compared a fixture field to itself ahead of the real behavioral check.
  - `@studnicky/boundary-kit`'s `undefined-result-vs-abort` scenario drops a tautological assertion ahead of the real result check.
  - `@studnicky/process-kit`'s `rejection` scenario asserts the thrown error's `constructor.name` from within the actual `assert.rejects` callback instead of comparing a fixture field to a hardcoded literal afterward.
  - `@studnicky/visible-range`'s `config-validation` `error-args` scenario asserts the constructed error's `cause`, `correlationId`, `metadata`, and `retryable` properties, matching its "structured error metadata" description. `visible-range.scenarios.json`'s `default-overscan` case now exercises a distinct count/itemSize combination instead of duplicating `simple-range` verbatim.
  - `@studnicky/memoize`'s `memoize-ttl-stale-options` scenario mocks `Date.now()` to advance past the configured `ttlMs`, proving the option reaches the underlying `LruCache` (an unwired option would keep replaying the first computed value indefinitely).

- 789da06: ### Fixed

  - Test-suite type errors across these packages' `tests/**` and `examples/**` are eliminated, gated on `tsc -p tsconfig.eslint.json`. Three patterns account for most of them:
    - **Un-narrowed scenario unions**: a runner map typed `Record<ScenarioCase['shape'], (c: ScenarioCase) => void>` gives every runner the full union instead of its own variant, so per-shape property access reports `TS2339`. Each runner map now types its entries `(c: Extract<ScenarioCase, { shape: K }>) => ...` via a generic `ScenarioRunner<K>`, and the dispatching `runCase`/`runnerMap[shape]` call sites are generic over the same `K`. Where one scenario variant legitimately shared its shape across multiple literal names (`Extract` distributes per union member, not per literal, so a shared-shape variant collapses to `never`), the variant is split into one member per literal instead.
    - **`this`-polymorphic factory explicit-type-argument pitfall**: `Subclass.create<T>(...)` on a `static create<T, TInstance extends Shape = Base<T>>(this: ..., ...)` factory blocks `TInstance` inference from `this`, silently returning the base type instead of the subclass and breaking every subclass-only member access. Dropping the explicit type argument (`Subclass.create(...)`) lets both parameters infer correctly. Constructors that already declared `public constructor() { super(); }` are unaffected by this and untouched.
    - **JSON-import scenario casts**: `scenarioGroups.cases` types as a JSON-literal-inferred union (widened `string` discriminants) that doesn't structurally satisfy the hand-written `ScenarioCase[]`/`Record<Shape, ...>` type without an explicit cast at the JSON→TS boundary — the same idiom already used at ~200 other call sites in this test suite.
  - A handful of one-off fixes ride along: `assert.equal(typeof x, 'y')`/`assert.ok(cond)` calls that don't narrow (replaced with explicit `if (typeof x !== 'y') throw` guards or reordered before use); array/object destructuring under strict indexed-access that needed a defined-check; a self-referential `typeof signal.addEventListener` type annotation in `resilience`; two `readonly T[]` getters typed as mutable `T[]` in `file-lock` and `cache`'s example files; a redundant no-op `.events.length = 0` on a freshly-constructed instance in `cache`'s example; and `exactOptionalPropertyTypes` mismatches where an object literal explicitly carried `| undefined` into a stricter target (`bounded-dispatcher`, `retry`).
  - `packages/mutex/tests/fixtures/constants.ts` imported `MutexConfigInterface` from a path that no longer exists; it now imports `MutexConfigEntity.Type` from its current location.
  - `packages/mutex/examples/keyedWorkGateComposition.ts`'s `mutex.runExclusive(key, fn)` call (no `acceptsResult` predicate) always types its result `unknown` by design; the example now supplies the `(value): value is string => ...` predicate the source's own JSDoc documents for this case.

  ### Left as-is (verified, not a defect)

  - `ErrorClassifier` is `abstract` with no static factory at all; subclasses are constructed directly.

- 789da06: ### Fixed

  - Every `*.scenarios.json` import across the test suites carries the `with { type: 'json' }` import attribute `module: NodeNext` requires, clearing 221 `TS1543` diagnostics that `tsc -b` never surfaced because test files aren't part of any package's typechecked build — only `tsconfig.eslint.json` (used for ESLint's type-aware rules) sees them, and it consumes type information without reporting `TS` diagnostics on its own.
  - Tests that constructed a `protected`-constructor class directly with `new` now call the class's `this`-polymorphic static factory instead (`Subclass.create(...)`), clearing 78 `TS2674` diagnostics across `Clock`, `Channel`, `Coalesce`, `EntityStore`, `CircuitBreaker`, `EventBus`, `Mutex`, and `RealTimeScheduler` subclasses. The remaining 86 `TS2674` instances are left on `new` because no fitting factory exists for that call site: `StateMachine` is abstract with no static factory at all; `EffectInterpreter`, `InterpreterHistory`, `DeadLetterQueue`, `Signal`, `FetchClient`, and `ErrorClassifier`'s factories (where one exists) hardcode their own class rather than accepting `this`, so calling them on a subclass returns the base type instead of the subclass; and `Channel`/`Coalesce` subclasses that are themselves generic and expose subclass-only members lose that member's type through the factory's necessarily looser `TInstance` bound, so the direct constructor call is correct as written.

- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
  - @studnicky/types@9.1.0
  - @studnicky/errors@9.1.0
  - @studnicky/json@9.1.0

## 9.0.0

### Major Changes

- d5be000: ### Changed

  - The package root is the sole public code entrypoint for configuration validation, clamping entities, and `ConfigurationError`.

  ### Added

  - `ClampedConfig` pure-static class, the soft-correction sibling to `ConfigValidation`'s hard-fail assertions: given a flat config object and a declarative table of `{min, max, reason}` rules per numeric field, `apply()` returns a **new** object with out-of-range numeric fields clamped into range instead of throwing. Fields absent from the rule table, non-numeric, or already in range are copied through unchanged; the input is never mutated.
  - `ClampedConfig` exposes a protected static `onClamp(event)` hook, mirroring `ConfigValidation`'s static hook idiom, overridable via subclassing to observe clamp events without coupling the base class to any logging package.
  - `ClampEventType` and `ClampRuleType` exported types.

- d5be000: This release establishes one canonical public path across the fixed `@studnicky/*` package group. Consumers import package-owned behavior, errors, entities, and interfaces from the owning package root, construct stateful primitives through `Class.create(config)`, and invoke direct operation methods. Package code subpaths and parallel construction APIs are outside the public contract.

  Composition packages expose the ordering, failure, aggregation, or publication behavior they own. Dependency functionality stays with its declaring package and is imported directly from that package root. Collaborator accessors do not mirror scheduler, semaphore, cache, coalescer, fetch, retry, signal, timing, context, machine, or interpreter APIs. `BoundedDispatcher.getBus()` remains the functional access path for subscribing to and draining dispatcher-owned publications.

  Every JSON-Schema-expressible pure-data structure is a schema-derived type alias. Interfaces represent only runtime, callable, constructor, nominal, readonly-access, class-bearing, or other contracts that are not wholly schema-expressible. Pure data referenced by an interface is declared separately as a schema-derived named type. Declaration comments provide no exemptions, and `entitySuite` configures `@typescript-eslint/prefer-function-type` as `off` so callable interfaces receive one consistent verdict.

  Schema and validator declarations import dependency-owned symbols directly: `FromSchema` and `JSONSchema` from `json-schema-to-ts`, `ValidateFunction` from `ajv`, and `JSONSchema7Type` from `json-schema`. Each consuming package declares the dependency it uses; substrate packages do not proxy-export those declarations.

  `HookInvoker.invoke(hookName, fn)` enters synchronous hooks and returns `undefined`. `HookInvoker.invokeAsync(hookName, fn)` observes completion and returns `Promise<void>`. `onHookError(hookName, cause)` controls failure disposition without fabricating a recovery value, while hook timeout and reentrancy failures retain their package error identities.

  FSM and process orchestration use one optional `EffectHandlerInterface<TEffect, TEvent>` handler. `EffectInterpreter`, `InterpreterHistory`, and `ProcessKit` accept it through their direct `create(config)` paths. `InterpreterHistory` retains bounded, oldest-first variant-changing transition records and returns isolated readonly snapshots.

  `Signal.create()` supplies instance `compose(options)` and `timeout(ms)` lifecycle behavior; `Signal.never()` supplies the static never-aborting sentinel. `Delay.sleep(ms, { clock?, scheduler?, signal? })` and `Delay.value(...)` share the scheduler-aware cancellation path.

  `Throttle.create(config)` validates and copies caller configuration into instance-owned state. Adaptive concurrency changes only the instance's effective limit. `getStats()` returns `ThrottleStatsEntity.Type`, and `ThrottleStatsEntity.validate` is the root-exported compiled validator for trust-boundary checks.

### Patch Changes

- Updated dependencies [d5be000]
- Updated dependencies [d5be000]
- Updated dependencies [d5be000]
- Updated dependencies [d5be000]
  - @studnicky/errors@9.0.0
  - @studnicky/json@9.0.0
  - @studnicky/types@9.0.0

## 8.0.1

### Patch Changes

- The test estate uses the controlled test-suite harness for coverage and JSON-backed loop fixtures with `input.batch` fan-out configuration across package scenario suites.
- Updated dependencies
  - @studnicky/errors@8.0.1
  - @studnicky/json@8.0.1
  - @studnicky/types@8.0.1

## 8.0.0

### Major Changes

- 837480d: ### Changed

  - The package root is the sole public code entrypoint for configuration validation, clamping entities, and `ConfigurationError`.

  ### Added

  - `ClampedConfig` pure-static class, the soft-correction sibling to `ConfigValidation`'s hard-fail assertions: given a flat config object and a declarative table of `{min, max, reason}` rules per numeric field, `apply()` returns a **new** object with out-of-range numeric fields clamped into range instead of throwing. Fields absent from the rule table, non-numeric, or already in range are copied through unchanged; the input is never mutated.
  - `ClampedConfig` exposes a protected static `onClamp(event)` hook, mirroring `ConfigValidation`'s static hook idiom, overridable via subclassing to observe clamp events without coupling the base class to any logging package.
  - `ClampEventType` and `ClampRuleType` exported types.

- 837480d: This release establishes one canonical public path across the fixed `@studnicky/*` package group. Consumers import package-owned behavior, errors, entities, and interfaces from the owning package root, construct stateful primitives through `Class.create(config)`, and invoke direct operation methods. Package code subpaths and parallel construction APIs are outside the public contract.

  Composition packages expose the ordering, failure, aggregation, or publication behavior they own. Dependency functionality stays with its declaring package and is imported directly from that package root. Collaborator accessors do not mirror scheduler, semaphore, cache, coalescer, fetch, retry, signal, timing, context, machine, or interpreter APIs. `BoundedDispatcher.getBus()` remains the functional access path for subscribing to and draining dispatcher-owned publications.

  Every JSON-Schema-expressible pure-data structure is a schema-derived type alias. Interfaces represent only runtime, callable, constructor, nominal, readonly-access, class-bearing, or other contracts that are not wholly schema-expressible. Pure data referenced by an interface is declared separately as a schema-derived named type. Declaration comments provide no exemptions, and `entitySuite` configures `@typescript-eslint/prefer-function-type` as `off` so callable interfaces receive one consistent verdict.

  Schema and validator declarations import dependency-owned symbols directly: `FromSchema` and `JSONSchema` from `json-schema-to-ts`, `ValidateFunction` from `ajv`, and `JSONSchema7Type` from `json-schema`. Each consuming package declares the dependency it uses; substrate packages do not proxy-export those declarations.

  `HookInvoker.invoke(hookName, fn)` enters synchronous hooks and returns `undefined`. `HookInvoker.invokeAsync(hookName, fn)` observes completion and returns `Promise<void>`. `onHookError(hookName, cause)` controls failure disposition without fabricating a recovery value, while hook timeout and reentrancy failures retain their package error identities.

  FSM and process orchestration use one optional `EffectHandlerInterface<TEffect, TEvent>` handler. `EffectInterpreter`, `InterpreterHistory`, and `ProcessKit` accept it through their direct `create(config)` paths. `InterpreterHistory` retains bounded, oldest-first variant-changing transition records and returns isolated readonly snapshots.

  `Signal.create()` supplies instance `compose(options)` and `timeout(ms)` lifecycle behavior; `Signal.never()` supplies the static never-aborting sentinel. `Delay.sleep(ms, { clock?, scheduler?, signal? })` and `Delay.value(...)` share the scheduler-aware cancellation path.

  `Throttle.create(config)` validates and copies caller configuration into instance-owned state. Adaptive concurrency changes only the instance's effective limit. `getStats()` returns `ThrottleStatsEntity.Type`, and `ThrottleStatsEntity.validate` is the root-exported compiled validator for trust-boundary checks.

### Patch Changes

- Updated dependencies [837480d]
- Updated dependencies [837480d]
- Updated dependencies [837480d]
- Updated dependencies [837480d]
  - @studnicky/errors@8.0.0
  - @studnicky/json@8.0.0
  - @studnicky/types@8.0.0

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `ConfigValidation` pure-static class with assertion methods (`assertString`, `assertNumber`, `assertBoolean`, `assertInteger`, `assertFinite`, `assertNonNegative`, `assertPositive`, `assertMin`, `assertPositiveOrInfinity`, `assertHasMethod`, `assertFunctionOrObjectWithMethod`, `assertNoUnknownKeys`) that throw `ConfigurationError` on failure and skip validation for `undefined`/`null` values.
- `TypeGuards` pure-static class with type predicates (`isObject`, `isFunction`, `isNonNegativeInteger`, `isPositiveInteger`) for runtime type narrowing.
- `ConfigurationError` error class with static `create(message, cause?)` factory, fixed error code `config.invalid`, and `retryable: false` semantics via `BaseError`.
