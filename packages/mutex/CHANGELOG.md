# Changelog

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
  - @studnicky/config@11.0.0
  - @studnicky/errors@11.0.0
  - @studnicky/fsm@11.0.0
  - @studnicky/json@11.0.0
  - @studnicky/types@11.0.0

## 10.0.0

### Patch Changes

- Updated dependencies [3e5575a]
  - @studnicky/errors@10.0.0
  - @studnicky/json@10.0.0
  - @studnicky/config@10.0.0
  - @studnicky/fsm@10.0.0

## 9.2.0

### Patch Changes

- Version bump only — no functional changes. Released in lockstep with the fixed-package group.

## 9.1.1

### Patch Changes

- @studnicky/config@9.1.1
- @studnicky/errors@9.1.1
- @studnicky/json@9.1.1

## 9.1.0

### Minor Changes

- 789da06: ### Changed

  - `@studnicky/visible-range`'s `VisibleRange.create()`, `@studnicky/virtual-fs`'s `VirtualFileSystem.create()`, `@studnicky/sliding-window-limiter`'s `SlidingWindowLimiter.create()`, `@studnicky/sample-buffer`'s `SampleBuffer.create()`, `@studnicky/retry`'s `Retry.create()`, `@studnicky/batch`'s `Batch.create()`, `@studnicky/cache`'s `LruCache.create()`, `@studnicky/boundary-kit`'s `BoundaryKit.create()`, `@studnicky/entity-store`'s `EntityStore.create()`, `@studnicky/idempotency-guard`'s `IdempotencyGuard.create()`, `@studnicky/mutex`'s `Mutex.create()`, `@studnicky/keyed-work-gate`'s `KeyedWorkGate.create()`, and `@studnicky/bounded-dispatcher`'s `BoundedDispatcher.create()` return the invoking subclass's own type instead of the base class. Each already constructed the subclass at runtime via `new this(...)`; the factory now types its `this` parameter and constructs through `Reflect.construct`, so `MySubclass.create(...)` types as `MySubclass` and a subclass member is readable without a cast. A runtime guard throws a `TypeError` naming the factory if construction ever yields an instance outside the requested subclass's prototype chain. Calling `Base.create(...)` directly is unaffected — it still types as `Base`.
  - `@studnicky/keyed-rate-limiter`'s `KeyedRateLimiter.create()` follows the same subclass-return pattern across all three overloads (the default `TokenBucket` configuration signature, the generic strategy signature, and the implementation signature). Its `keyed-rate-limiter.loop.spec.ts` suite drops the five `as TrackingLimiter`/`as TrackingEvictionLimiter`/`as ThrowingEvictedLimiter` return-type casts that existed only because the factory wasn't polymorphic.

### Patch Changes

- 789da06: ### Changed

  - `@studnicky/fsm`'s `.loop.spec.ts` suites construct every locally-defined `StateMachine` subclass through a small explicitly-typed factory (or a subclass-declared public constructor) instead of an inline `new Xxx()`, so `EffectInterpreter.create`/`InterpreterHistory.create`/`MachineRegistry`'s generic parameters infer correctly instead of collapsing to `unknown`. `InterpreterHistory.loop.spec.ts`, `MachineRegistry.loop.spec.ts`, `MachineRegistryHooks.loop.spec.ts`, `StateMachine.loop.spec.ts`, and `StateMachineHooks.loop.spec.ts` retype their scenario `runnerMap`s as per-shape mapped types (`{ [K in Shape]: (c: Extract<ScenarioCase, { shape: K }>) => ... }`) so each handler narrows to its own scenario case instead of the full union; `InterpreterHistory`'s and `StateMachine`'s scenario types split every shape field that held more than one literal into its own discriminated-union member. `StateMachine.loop.spec.ts` gains a `PlainErrorThrowingMachine` covering the non-`Error` reducer-throw path with its own `expectedReason` assertion.
  - `@studnicky/mutex`'s `coalescing.loop.spec.ts`, `fsm.loop.spec.ts`, `reentrancy.loop.spec.ts`, `observability.loop.spec.ts`, and `mutex-core.loop.spec.ts` apply the same per-shape `runnerMap` narrowing; `coalescing.loop.spec.ts`'s combined `stats-coalescedCount-enabled`/`-disabled` case becomes two discriminated members. Array-index and settled-promise accesses that could be `undefined` now go through explicit guards instead of relying on ambient narrowing. `tests/fixtures/constants.ts` imports `MutexConfigEntity` from its real path instead of a `MutexConfigInterface` module that never existed. `examples/observedMutex.ts`'s `TracingMutex.create()` call drops an explicit `<string>` type argument that was defeating `this`-polymorphic inference and returning the base `Mutex` type; `examples/keyedWorkGateComposition.ts`'s `runExclusive` call supplies a type-predicate guard so its result narrows to `string`.
  - All touched `.loop.spec.ts`/example files pick up the `with { type: 'json' }` import attribute their JSON scenario imports need under the stricter test typecheck.

- 789da06: ### Changed

  - `Mutex` documents its FIFO acquisition contract: waiters queued behind a held lock are granted access in request order, and a burst of queued waiters that time out together reject in that same order. Documented on the class TSDoc and in the README's new "Ordering" section, and referenced from the `burst-timeout-drains-queue` scenario so the exact-order assertion reads as contract verification.
  - `entitySuite`'s hand-written duplicate test (`entitySuite.test.ts`) is removed in favor of its data-driven equivalent (`entitySuite.loop.spec.ts` / `entitySuite.scenarios.json`), which gains the three `assigns-owning-rule` fixtures (naked type-alias-to-interface, suffix-collision pure data, dual-remediation contract) it was missing.

- 789da06: ### Changed

  - `v8/inline-arrow-functions` and `v8/inline-functions` no longer exempt a dispatch-map property by its key name (`callback`, `execute`, `handler`, `message`, `process`, `transform`, `transformAsync`, `validate`). Whether an inline arrow or function value is flagged depends only on whether the enclosing object literal is rebuilt on every call — a module-scope `const` or `static` class field is still exempt, a map rebuilt inside a function body is still flagged, regardless of what its properties are named.
  - `descriptive-identifiers` no longer whitelists acronyms or loop-iterator names. Whether an identifier is flagged depends only on whether one of its camelCase tokens matches a banned shortening; single-letter loop iterators and short acronyms already fall outside that check structurally, since they never match a banned-shortening token.
  - `folder-content-shape` no longer exempts a file from the constants-placement or inline-regex checks by path (`constants/`, `fixtures/`, `tests/`, the `eslint-config` package, `eslint.config.mjs`, `entities/`, or an `index.ts` basename) or by declared name (`ajv`, `compiledValidator`, `Schema`, `validate`). A file is exempt only when it is structurally one of: a pure constants module (every top-level declaration is an import, a type declaration, or a data `const`), a module exporting an `*Entity`-named namespace, or a pure re-export barrel. Renaming a directory, moving a file into `constants/`, or naming a declaration `Schema`/`validate`/`ajv` no longer buys an escape on its own.

  ### Fixed

  - Thirteen domain error classes (`VisibleRangeError`, `VirtualFileSystemError`, `SampleBufferError`, `CircularBufferError`, `BatchError`, `QueueSizeExceededError`, `FileLockTimeoutError`, `ConnectTimeoutError`, `TimeoutError`, `BodyTimeoutError`, `HeadersTimeoutError`, `SocketError`, `CoalesceTimeoutError`) hoist their `DomainErrorArgs.build()` message builder to a `private static` class method instead of an inline arrow rebuilt on every construction call.

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
  - @studnicky/config@9.1.0
  - @studnicky/errors@9.1.0
  - @studnicky/json@9.1.0

## 9.0.0

### Major Changes

- d5be000: ### Changed

  - The package root is the sole public code entrypoint. Mutex implementation constants remain internal.
  - `Mutex.create(config?)` is the sole construction entry point; the constructor remains protected for subclassing.
  - `Mutex.create()` uses `new this()` internally so subclass factories return the correct subclass type.
  - Per-key FSM state is exported as the schema-backed `MutexKeyStateEntity.Type`.

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
  - @studnicky/config@9.0.0
  - @studnicky/errors@9.0.0
  - @studnicky/json@9.0.0

## 8.0.1

### Patch Changes

- The test estate uses the controlled test-suite harness for coverage and JSON-backed loop fixtures with `input.batch` fan-out configuration across package scenario suites.
- Updated dependencies
  - @studnicky/config@8.0.1
  - @studnicky/errors@8.0.1
  - @studnicky/json@8.0.1

## 8.0.0

### Major Changes

- 837480d: ### Changed

  - The package root is the sole public code entrypoint. Mutex implementation constants remain internal.
  - `Mutex.create(config?)` is the sole construction entry point; the constructor remains protected for subclassing.
  - `Mutex.create()` uses `new this()` internally so subclass factories return the correct subclass type.
  - Per-key FSM state is exported as the schema-backed `MutexKeyStateEntity.Type`.

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
  - @studnicky/config@8.0.0
  - @studnicky/errors@8.0.0
  - @studnicky/json@8.0.0

## 7.0.1

### Patch Changes

- @studnicky/config@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. Fluent builders assemble their options object via `@studnicky/types`'s `PickDefined.from()` instead of manual spread-ternary chains. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/config@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- Key-based `Mutex<K>` class with per-key serialization: concurrent operations on different keys run in parallel, operations on the same key queue serially.
- Three acquisition modes: `acquire()` returning a manual release function, `acquireDisposable()` for `await using` syntax (Node.js 24+), and `runExclusive()` for automatic acquire/release around a callback.
- Protected lifecycle hooks (`beforeAcquire`, `afterAcquire`, `onContended`, `beforeRelease`, `afterRelease`, `onTimeout`) for subclass-level observability without coupling the base class to any logging or metrics library.
- `MutexBuilder<K>` fluent builder with `.withMaxQueueSize()`, `.withTimeout()`, and `.withCoalescing()` for declarative configuration; optional request coalescing collapses concurrent `runExclusive` calls on the same key into a single in-flight operation.
