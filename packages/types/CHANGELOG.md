# Changelog

## 11.1.0

### Minor Changes

- 44865fd: Adds `Predicates.isIpInCidr`, `Predicates.ipv4ToUint32`, `Predicates.parseCidrRange`,
  `Predicates.satisfiesSemverRange`, `Predicates.compareSemverVersions`, and
  `Predicates.asStrictNumber`, generalizing value-matching logic that `@studnicky/drilldown`
  and the filters module both need. `Predicates.performRangeComparison` gains an options
  object with `caseSensitive` (for its string branch) and `boundary: 'closed' | 'half-open'`
  (for its numeric/date branches) — both default to the prior behavior, so every existing
  call site is unaffected.
  
  Extracted while auditing `@studnicky/drilldown`'s matcher vocabulary against the filters
  module's operator vocabulary for shared concepts: CIDR/IP matching and semver range
  satisfaction existed nowhere in `@studnicky/types` or filters before this; alphabetic
  range matching and half-open numeric/date ranges were near-duplicates of existing
  `performRangeComparison` behavior, now unified.
  
  An adversarial review of this same unreleased branch caught and fixed several edge cases
  before anything shipped: `^0.0.x` now locks the patch version (not just minor), a bare
  `~1` range now matches any `1.x.x` (not just `1.0.x`), build metadata (`+build.1`) no
  longer breaks parsing, IP/CIDR segments with trailing non-digit garbage (e.g. `10.0.0.1x`)
  are now rejected instead of silently truncated, and prerelease precedence now compares
  dot-separated identifiers per the semver spec (numeric-aware, not a flat string sort) —
  these are all bug fixes to methods that only landed in this same unreleased branch, not
  changes to a previously-shipped API.

## 11.0.1

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

## 10.0.0

## 9.2.0

### Patch Changes

- Version bump only — no functional changes. Released in lockstep with the fixed-package group.

## 9.1.1

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

  - Every `*.scenarios.json` import across the test suites carries the `with { type: 'json' }` import attribute `module: NodeNext` requires, clearing 221 `TS1543` diagnostics that `tsc -b` never surfaced because test files aren't part of any package's typechecked build — only `tsconfig.eslint.json` (used for ESLint's type-aware rules) sees them, and it consumes type information without reporting `TS` diagnostics on its own.
  - Tests that constructed a `protected`-constructor class directly with `new` now call the class's `this`-polymorphic static factory instead (`Subclass.create(...)`), clearing 78 `TS2674` diagnostics across `Clock`, `Channel`, `Coalesce`, `EntityStore`, `CircuitBreaker`, `EventBus`, `Mutex`, and `RealTimeScheduler` subclasses. The remaining 86 `TS2674` instances are left on `new` because no fitting factory exists for that call site: `StateMachine` is abstract with no static factory at all; `EffectInterpreter`, `InterpreterHistory`, `DeadLetterQueue`, `Signal`, `FetchClient`, and `ErrorClassifier`'s factories (where one exists) hardcode their own class rather than accepting `this`, so calling them on a subclass returns the base type instead of the subclass; and `Channel`/`Coalesce` subclasses that are themselves generic and expose subclass-only members lose that member's type through the factory's necessarily looser `TInstance` bound, so the direct constructor call is correct as written.

## 9.0.0

### Major Changes

- d5be000: The package root is the sole code entrypoint for every runtime helper. `JsonValue.is` and `JsonValue.from` use `JSONSchema7Type` from its owner module, `json-schema`; `@types/json-schema` supplies the package's direct declaration dependency. The package exports runtime helpers only: `Empty`, `Guard`, `JsonObject`, `JsonValue`, and `PickDefined`.
- d5be000: This release establishes one canonical public path across the fixed `@studnicky/*` package group. Consumers import package-owned behavior, errors, entities, and interfaces from the owning package root, construct stateful primitives through `Class.create(config)`, and invoke direct operation methods. Package code subpaths and parallel construction APIs are outside the public contract.

  Composition packages expose the ordering, failure, aggregation, or publication behavior they own. Dependency functionality stays with its declaring package and is imported directly from that package root. Collaborator accessors do not mirror scheduler, semaphore, cache, coalescer, fetch, retry, signal, timing, context, machine, or interpreter APIs. `BoundedDispatcher.getBus()` remains the functional access path for subscribing to and draining dispatcher-owned publications.

  Every JSON-Schema-expressible pure-data structure is a schema-derived type alias. Interfaces represent only runtime, callable, constructor, nominal, readonly-access, class-bearing, or other contracts that are not wholly schema-expressible. Pure data referenced by an interface is declared separately as a schema-derived named type. Declaration comments provide no exemptions, and `entitySuite` configures `@typescript-eslint/prefer-function-type` as `off` so callable interfaces receive one consistent verdict.

  Schema and validator declarations import dependency-owned symbols directly: `FromSchema` and `JSONSchema` from `json-schema-to-ts`, `ValidateFunction` from `ajv`, and `JSONSchema7Type` from `json-schema`. Each consuming package declares the dependency it uses; substrate packages do not proxy-export those declarations.

  `HookInvoker.invoke(hookName, fn)` enters synchronous hooks and returns `undefined`. `HookInvoker.invokeAsync(hookName, fn)` observes completion and returns `Promise<void>`. `onHookError(hookName, cause)` controls failure disposition without fabricating a recovery value, while hook timeout and reentrancy failures retain their package error identities.

  FSM and process orchestration use one optional `EffectHandlerInterface<TEffect, TEvent>` handler. `EffectInterpreter`, `InterpreterHistory`, and `ProcessKit` accept it through their direct `create(config)` paths. `InterpreterHistory` retains bounded, oldest-first variant-changing transition records and returns isolated readonly snapshots.

  `Signal.create()` supplies instance `compose(options)` and `timeout(ms)` lifecycle behavior; `Signal.never()` supplies the static never-aborting sentinel. `Delay.sleep(ms, { clock?, scheduler?, signal? })` and `Delay.value(...)` share the scheduler-aware cancellation path.

  `Throttle.create(config)` validates and copies caller configuration into instance-owned state. Adaptive concurrency changes only the instance's effective limit. `getStats()` returns `ThrottleStatsEntity.Type`, and `ThrottleStatsEntity.validate` is the root-exported compiled validator for trust-boundary checks.

## 8.0.1

### Patch Changes

- The test estate uses the controlled test-suite harness for coverage and JSON-backed loop fixtures with `input.batch` fan-out configuration across package scenario suites.

## 8.0.0

### Major Changes

- 837480d: The package root is the sole code entrypoint for every runtime helper. `JsonValue.is` and `JsonValue.from` use `JSONSchema7Type` from its owner module, `json-schema`; `@types/json-schema` supplies the package's direct declaration dependency. The package exports runtime helpers only: `Empty`, `Guard`, `JsonObject`, `JsonValue`, and `PickDefined`.
- 837480d: This release establishes one canonical public path across the fixed `@studnicky/*` package group. Consumers import package-owned behavior, errors, entities, and interfaces from the owning package root, construct stateful primitives through `Class.create(config)`, and invoke direct operation methods. Package code subpaths and parallel construction APIs are outside the public contract.

  Composition packages expose the ordering, failure, aggregation, or publication behavior they own. Dependency functionality stays with its declaring package and is imported directly from that package root. Collaborator accessors do not mirror scheduler, semaphore, cache, coalescer, fetch, retry, signal, timing, context, machine, or interpreter APIs. `BoundedDispatcher.getBus()` remains the functional access path for subscribing to and draining dispatcher-owned publications.

  Every JSON-Schema-expressible pure-data structure is a schema-derived type alias. Interfaces represent only runtime, callable, constructor, nominal, readonly-access, class-bearing, or other contracts that are not wholly schema-expressible. Pure data referenced by an interface is declared separately as a schema-derived named type. Declaration comments provide no exemptions, and `entitySuite` configures `@typescript-eslint/prefer-function-type` as `off` so callable interfaces receive one consistent verdict.

  Schema and validator declarations import dependency-owned symbols directly: `FromSchema` and `JSONSchema` from `json-schema-to-ts`, `ValidateFunction` from `ajv`, and `JSONSchema7Type` from `json-schema`. Each consuming package declares the dependency it uses; substrate packages do not proxy-export those declarations.

  `HookInvoker.invoke(hookName, fn)` enters synchronous hooks and returns `undefined`. `HookInvoker.invokeAsync(hookName, fn)` observes completion and returns `Promise<void>`. `onHookError(hookName, cause)` controls failure disposition without fabricating a recovery value, while hook timeout and reentrancy failures retain their package error identities.

  FSM and process orchestration use one optional `EffectHandlerInterface<TEffect, TEvent>` handler. `EffectInterpreter`, `InterpreterHistory`, and `ProcessKit` accept it through their direct `create(config)` paths. `InterpreterHistory` retains bounded, oldest-first variant-changing transition records and returns isolated readonly snapshots.

  `Signal.create()` supplies instance `compose(options)` and `timeout(ms)` lifecycle behavior; `Signal.never()` supplies the static never-aborting sentinel. `Delay.sleep(ms, { clock?, scheduler?, signal? })` and `Delay.value(...)` share the scheduler-aware cancellation path.

  `Throttle.create(config)` validates and copies caller configuration into instance-owned state. Adaptive concurrency changes only the instance's effective limit. `getStats()` returns `ThrottleStatsEntity.Type`, and `ThrottleStatsEntity.validate` is the root-exported compiled validator for trust-boundary checks.

## 7.0.1

## 7.0.0

### Minor Changes

- d2b44b7: `@studnicky/types` exports `PickDefined.from(record)`, which strips `undefined`-valued keys from a record while narrowing each remaining value's type away from `undefined` — built for builders assembling an options object from a mix of required and optional fields.

  `@studnicky/errors` exports `DomainErrorArgs.build(fields, options)`, which computes `code`, `message`, `retryable`, `cause`, `correlationId`, and `metadata` for a `super()` call while preserving the leaf error's `extends` chain and `instanceof` behavior.

  `@studnicky/logger` exports `ResolveMinLevel.from(options)` for the level validation and resolution shared by built-in and third-party `TransportInterface` implementations.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Guard` pure-static runtime accessors and predicates for narrowing `unknown` values.
- `JsonObject` and `JsonValue` runtime boundaries for plain objects and recursive JSON-compatible values.
