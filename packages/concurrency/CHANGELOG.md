# Changelog

## 9.1.1

### Patch Changes

- @studnicky/circular-buffer@9.1.1
- @studnicky/errors@9.1.1
- @studnicky/json@9.1.1

## 9.1.0

### Minor Changes

- 789da06: ### Changed

  - `@studnicky/resilience`'s `CircuitBreaker.create()` and `TokenBucket.create()` return the invoking subclass's own type instead of the base class. Each already constructed the subclass at runtime via `new this(...)`; the factory now types its `this` parameter and constructs through `Reflect.construct`, so `MySubclass.create(...)` types as `MySubclass` and a subclass member is readable without a cast. A runtime guard throws a `TypeError` naming the factory if construction ever yields an instance outside the requested subclass's prototype chain. Calling `Base.create(...)` directly is unaffected — it still types as `Base`.
  - `@studnicky/scheduler`'s `MinimumHeap.create()`, `VirtualScheduler.create()`, and `RealTimeScheduler.create()` follow the same subclass-return pattern.
  - `@studnicky/concurrency`'s `Semaphore.create()` follows the same subclass-return pattern. `Channel.create<T>()` and `Coalesce.create<T>()` follow it too, with `TInstance` bounded by a new `ChannelShapeInterface`/`CoalesceShapeInterface` (each just the one public member — `close()`, `isInflight()` — that doesn't mention the class's own item-type parameter) rather than by `Channel<T>`/`Coalesce<T>` directly: binding to the class's own generic type forces the method's general, unconstrained `T` to satisfy the bound, which fails the moment `T` appears in a callback-shaped (contravariant) position. The narrower bound still proves the returned value is shaped like the base class, without that failure mode.
  - `@studnicky/event-bus`'s `BusQueue.create<T>()` and `EventBus.create<TTopicMap>()` follow the same shape-interface-bounded pattern (`BusQueueShapeInterface`/`EventBusShapeInterface`, each the type-parameter-independent `drain()`/`close()` members). `EventBus.loop.spec.ts`, `BusQueue.loop.spec.ts`, and `examples/observedEventBus.ts` drop twelve `static override create()` overrides that hardcoded `new ConcreteClass(...)` — the pre-existing per-subclass workaround this conversion makes redundant, and one a properly polymorphic `create()` can no longer be validly overridden by.
  - `@studnicky/memoize`'s `Memoize.create<TArgs, TResult>()` follows the same shape-interface-bounded pattern (`MemoizeShapeInterface`, just `clear()`, the one public member independent of `TArgs`/`TResult`) in place of the `TInstance extends Memoize<TArgs, TResult>` bound it carried since its own original conversion — that bound hit the identical failure the moment `TArgs` (a rest-tuple parameter of the memoized function, a callback-shaped position) was inferred from an unannotated callback. `memoize.loop.spec.ts` adds an explicit parameter type to four memoized-function literals that previously relied on inference collapsing correctly by accident.

### Patch Changes

- 789da06: ### Fixed

  - `@studnicky/circular-buffer`'s `CircularBuffer.unshift.loop.spec.ts` dispatches each scenario through an `Extract`-keyed `ScenarioRunner<K>`/`RunnerMap` instead of handing every runner the full eleven-member scenario union. `CircularBuffer.loop.spec.ts`'s `requireExpected*`/`requireBatch*` helpers narrow with `assert.ok(typeof x === 'number', …)` in place of `assert.equal(typeof x, 'number', …)`, which asserts the string `typeof` result rather than narrowing `x` itself. `CircularBufferError.loop.spec.ts`'s scenario `metadata` fields type as `Record<string, JSONSchema7Type>`, matching the constructor's actual `Readonly<Record<string, JSONSchema7Type>>` contract instead of the wider `Record<string, unknown>`.
  - `@studnicky/throttle`'s `configuration.loop.spec.ts`, `delay.loop.spec.ts`, `fsm.loop.spec.ts`, `instantiation.loop.spec.ts`, and `entity-contracts.loop.spec.ts` dispatch through the same `Extract`-keyed `RunnerMap` pattern. `tests/helpers/VirtualClockThrottle.ts` renames its clock-injecting factory to `createWithClock(...)` so it no longer collides with `Throttle`'s non-polymorphic `static create()` signature. `configuration.loop.spec.ts` narrows `concurrencyLimit` with an explicit `typeof === 'number'` check before use under `exactOptionalPropertyTypes`.
  - `@studnicky/pipeline`'s `Pipeline.loop.spec.ts` splits three scenario members that combined multiple `shape` literals into one (e.g. `'empty-pipeline-returns-input' | 'single-async-stage-applies'`) into one member per literal, so its `Extract`-keyed dispatch narrows correctly instead of collapsing to `never`. `examples/observedPipeline.ts` and `PipelineSubclass.loop.spec.ts` give `TracingPipeline`, `BracketPipeline`, `ObservingPipeline`, and `InspectPipeline` explicit `public constructor`s and construct them with `new` — `Pipeline`'s stage functions make its type parameter invariant, so its factory stays intentionally non-polymorphic.
  - `@studnicky/idempotency-guard`'s `idempotency-guard.loop.spec.ts` replaces its JSON-import-derived `ScenarioCase` (whose `shape` field widens to plain `string` under `resolveJsonModule`, collapsing every `Extract` to `never`) with a hand-declared 24-variant discriminated union and matching concrete `asserts scenario is Extract<ScenarioCase, {shape: '…'}>` guards, one per shape.
  - `@studnicky/concurrency`'s `AsyncIter.loop.spec.ts` splits three scenario members with combined `shape` literals into one member per literal and parameterizes an `AsyncIter.enrich` call explicitly instead of relying on inference. `Channel.loop.spec.ts` converts to the `Extract`-keyed pattern and corrects the `onClose-hooks` scenario's declared `input` type to match its actual `{ before, after }` fixture shape. `Semaphore.loop.spec.ts` binds `waiters[0]`/`waiters[1]` to a local and asserts definedness before use under `noUncheckedIndexedAccess`. `examples/boundedDispatcherComposition.ts` makes two callbacks `async` to match `Dispatcher`'s `() => Promise<T>` contract.
  - `@studnicky/keyed-work-gate`'s `keyed-work-gate.loop.spec.ts` converts to the `Extract`-keyed pattern via a `runCase` dispatch helper and drops a dead `delayMs` reference the `single-flight-reruns-after-settle` scenario never actually carried. `examples/observedKeyedWorkGate.ts` drops redundant `static override create()` overrides on `TelemetryMutex`/`TelemetryCoalesce` so the base classes' polymorphic factory applies directly.

- 789da06: ### Changed

  - `v8/inline-arrow-functions` and `v8/inline-functions` no longer exempt a dispatch-map property by its key name (`callback`, `execute`, `handler`, `message`, `process`, `transform`, `transformAsync`, `validate`). Whether an inline arrow or function value is flagged depends only on whether the enclosing object literal is rebuilt on every call — a module-scope `const` or `static` class field is still exempt, a map rebuilt inside a function body is still flagged, regardless of what its properties are named.
  - `descriptive-identifiers` no longer whitelists acronyms or loop-iterator names. Whether an identifier is flagged depends only on whether one of its camelCase tokens matches a banned shortening; single-letter loop iterators and short acronyms already fall outside that check structurally, since they never match a banned-shortening token.
  - `folder-content-shape` no longer exempts a file from the constants-placement or inline-regex checks by path (`constants/`, `fixtures/`, `tests/`, the `eslint-config` package, `eslint.config.mjs`, `entities/`, or an `index.ts` basename) or by declared name (`ajv`, `compiledValidator`, `Schema`, `validate`). A file is exempt only when it is structurally one of: a pure constants module (every top-level declaration is an import, a type declaration, or a data `const`), a module exporting an `*Entity`-named namespace, or a pure re-export barrel. Renaming a directory, moving a file into `constants/`, or naming a declaration `Schema`/`validate`/`ajv` no longer buys an escape on its own.

  ### Fixed

  - Thirteen domain error classes (`VisibleRangeError`, `VirtualFileSystemError`, `SampleBufferError`, `CircularBufferError`, `BatchError`, `QueueSizeExceededError`, `FileLockTimeoutError`, `ConnectTimeoutError`, `TimeoutError`, `BodyTimeoutError`, `HeadersTimeoutError`, `SocketError`, `CoalesceTimeoutError`) hoist their `DomainErrorArgs.build()` message builder to a `private static` class method instead of an inline arrow rebuilt on every construction call.

- 789da06: ### Changed

  - `@studnicky/resilience`'s `resilience.scenarios.json` suite covers `DeadLetterQueue`'s constructor-time rejection of a non-positive `capacity`. `resilience-tokenbucket-hook-swallows` asserts the deterministic post-refill token count exactly (`5`) instead of a loose `>= 4` threshold.
  - `@studnicky/sample-buffer`'s `percentile-range-p95`/`-p99` scenarios assert the exact linearly-interpolated percentile value (`95.05`/`99.01`) instead of a floor/ceil range that an interpolation-free implementation would also satisfy.
  - `@studnicky/request-executor`'s `RequestDeadlineEntity` scenarios cover its `additionalProperties: false` and `deadlineMs` type constraint, alongside the existing numeric lower-bound case.
  - `@studnicky/entity-store`'s `getAll` cache-invalidation scenario asserts the sorted id sequence before and after a mutation, matching `getAll`'s documented "sorted output" contract, instead of counting `sortComparer` invocations to infer an undocumented internal cache.
  - `@studnicky/event-bus`'s `publish-empty-topic` scenario asserts `onPublish` never fires when a topic has no subscribers. `preaborted-caller-signal`'s description and assertions now match what the scenario actually proves: a subscriber registered with an already-aborted signal never receives a published event. `BusQueue`'s `abort-releases-pending` scenario tracks and asserts the pending `enqueue()` call actually resolves after the drain releases it.
  - `@studnicky/keyed-rate-limiter`'s scenario suite drops ten dead `completed: true` fixture fields and their self-referential assertions, each sitting after a real behavioral assertion.
  - `@studnicky/flag-evaluator`'s `flag-context-entity-accepts` scenario asserts each validation result against the fixture's `expected.result` field instead of a hardcoded literal, dropping the redundant closing assertion.
  - `@studnicky/concurrency`'s hand-written `entities.test.ts` duplicate is removed; its assertions were already covered by the data-driven `entities.loop.spec.ts` / `entities.scenarios.json` pair.

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
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
  - @studnicky/circular-buffer@9.1.0
  - @studnicky/errors@9.1.0
  - @studnicky/json@9.1.0

## 9.0.0

### Major Changes

- d5be000: ### Changed

  - The package root is the sole code entrypoint for `AsyncIter`, `Channel`, `Coalesce`, `Semaphore`, their option entities, and package errors.
  - `Channel.create(options?)`, `Coalesce.create(options?)`, and `Semaphore.create(options)` are the sole construction entry points; constructors are protected.
  - `Semaphore.create()` accepts the schema-validated `SemaphoreOptionsEntity.Type` options object `{ permits }`.

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
  - @studnicky/circular-buffer@9.0.0
  - @studnicky/errors@9.0.0
  - @studnicky/json@9.0.0

## 8.0.1

### Patch Changes

- The test estate uses the controlled test-suite harness for coverage and JSON-backed loop fixtures with `input.batch` fan-out configuration across package scenario suites.
- Updated dependencies
  - @studnicky/circular-buffer@8.0.1
  - @studnicky/errors@8.0.1
  - @studnicky/json@8.0.1

## 8.0.0

### Major Changes

- 837480d: ### Changed

  - The package root is the sole code entrypoint for `AsyncIter`, `Channel`, `Coalesce`, `Semaphore`, their option entities, and package errors.
  - `Channel.create(options?)`, `Coalesce.create(options?)`, and `Semaphore.create(options)` are the sole construction entry points; constructors are protected.
  - `Semaphore.create()` accepts the schema-validated `SemaphoreOptionsEntity.Type` options object `{ permits }`.

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
  - @studnicky/circular-buffer@8.0.0
  - @studnicky/errors@8.0.0
  - @studnicky/json@8.0.0

## 7.0.1

### Patch Changes

- @studnicky/circular-buffer@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. Fluent builders assemble their options object via `@studnicky/types`'s `PickDefined.from()` instead of manual spread-ternary chains. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/circular-buffer@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Semaphore`: counting permit gate with `acquire()` returning an idempotent release function, `withPermit()` for automatic acquire/release around a callback, and `available`/`permits` getters.
- `Coalesce`: keyed async coalescing that reserves the shared completion before `onCoalesceStart` and the factory, so reentrant and concurrent callers join the same in-flight promise. A start-hook or factory rejection is shared by the leader and every joiner; `isInflight()` provides observability.
- `Channel`: string-keyed fan-in async generator inbox; `publish()` buffers items to a named key, `subscribe()` yields them as an async generator, `close()` terminates all active subscribers.
- `AsyncIter`: static-method class with three async-iterable combinators — `merge()` for FIFO fan-in of N sources, `filter()` for sync/async predicate filtering, and `enrich()` for left-join enrichment with null-passthrough.
