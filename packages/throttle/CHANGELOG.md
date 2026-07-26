# Changelog

## 9.1.1

### Patch Changes

- @studnicky/circular-buffer@9.1.1
- @studnicky/config@9.1.1
- @studnicky/errors@9.1.1
- @studnicky/json@9.1.1
- @studnicky/sample-buffer@9.1.1
- @studnicky/signal@9.1.1
- @studnicky/types@9.1.1

## 9.1.0

### Minor Changes

- 789da06: ### Changed

  - `@studnicky/fetch`'s `FetchClient.create()`, `TestDispatcher.create()`, and `UndiciDispatcher.create()` return the invoking subclass's own type instead of the base class. Each already constructed the subclass via `new this(...)`; the factory now types its `this` parameter and constructs through `Reflect.construct`, so `MySubclass.create(...)` types as `MySubclass` and a subclass member is readable without a cast. A runtime guard throws a `TypeError` naming the factory if construction ever yields an instance outside the requested subclass's prototype chain. Calling the base class's `create(...)` directly is unaffected.
  - `@studnicky/context`'s `Context.create()` and `@studnicky/throttle`'s `Throttle.create()` follow the same conversion. These were the last two factories in the workspace still declaring the base class as their return type.
  - Subclasses across `fetch`, `request-executor`, `context`, and `throttle` drop their `static override create()` declarations. Each hardcoded `new ConcreteClass(...)` to recover the subclass type from a base-typed factory — the per-subclass workaround this conversion makes redundant, and one a properly polymorphic `create()` can no longer be validly overridden by.

  `@studnicky/fetch`'s `DispatcherAgent.create()` and its browser counterpart are unchanged: they return a foreign type or throw, so they are not factories of their own class.

- 789da06: ### Added

  - `Throttle` exposes a `protected now(): number` extension seam. All internal wall-clock reads — operation start/duration timing and the adaptive-adjustment interval gate — route through it, so a subclass can substitute a deterministic time source without touching global `Date.now`.

### Patch Changes

- 789da06: ### Fixed

  - `@studnicky/circular-buffer`'s `CircularBuffer.unshift.loop.spec.ts` dispatches each scenario through an `Extract`-keyed `ScenarioRunner<K>`/`RunnerMap` instead of handing every runner the full eleven-member scenario union. `CircularBuffer.loop.spec.ts`'s `requireExpected*`/`requireBatch*` helpers narrow with `assert.ok(typeof x === 'number', …)` in place of `assert.equal(typeof x, 'number', …)`, which asserts the string `typeof` result rather than narrowing `x` itself. `CircularBufferError.loop.spec.ts`'s scenario `metadata` fields type as `Record<string, JSONSchema7Type>`, matching the constructor's actual `Readonly<Record<string, JSONSchema7Type>>` contract instead of the wider `Record<string, unknown>`.
  - `@studnicky/throttle`'s `configuration.loop.spec.ts`, `delay.loop.spec.ts`, `fsm.loop.spec.ts`, `instantiation.loop.spec.ts`, and `entity-contracts.loop.spec.ts` dispatch through the same `Extract`-keyed `RunnerMap` pattern. `tests/helpers/VirtualClockThrottle.ts` renames its clock-injecting factory to `createWithClock(...)` so it no longer collides with `Throttle`'s non-polymorphic `static create()` signature. `configuration.loop.spec.ts` narrows `concurrencyLimit` with an explicit `typeof === 'number'` check before use under `exactOptionalPropertyTypes`.
  - `@studnicky/pipeline`'s `Pipeline.loop.spec.ts` splits three scenario members that combined multiple `shape` literals into one (e.g. `'empty-pipeline-returns-input' | 'single-async-stage-applies'`) into one member per literal, so its `Extract`-keyed dispatch narrows correctly instead of collapsing to `never`. `examples/observedPipeline.ts` and `PipelineSubclass.loop.spec.ts` give `TracingPipeline`, `BracketPipeline`, `ObservingPipeline`, and `InspectPipeline` explicit `public constructor`s and construct them with `new` — `Pipeline`'s stage functions make its type parameter invariant, so its factory stays intentionally non-polymorphic.
  - `@studnicky/idempotency-guard`'s `idempotency-guard.loop.spec.ts` replaces its JSON-import-derived `ScenarioCase` (whose `shape` field widens to plain `string` under `resolveJsonModule`, collapsing every `Extract` to `never`) with a hand-declared 24-variant discriminated union and matching concrete `asserts scenario is Extract<ScenarioCase, {shape: '…'}>` guards, one per shape.
  - `@studnicky/concurrency`'s `AsyncIter.loop.spec.ts` splits three scenario members with combined `shape` literals into one member per literal and parameterizes an `AsyncIter.enrich` call explicitly instead of relying on inference. `Channel.loop.spec.ts` converts to the `Extract`-keyed pattern and corrects the `onClose-hooks` scenario's declared `input` type to match its actual `{ before, after }` fixture shape. `Semaphore.loop.spec.ts` binds `waiters[0]`/`waiters[1]` to a local and asserts definedness before use under `noUncheckedIndexedAccess`. `examples/boundedDispatcherComposition.ts` makes two callbacks `async` to match `Dispatcher`'s `() => Promise<T>` contract.
  - `@studnicky/keyed-work-gate`'s `keyed-work-gate.loop.spec.ts` converts to the `Extract`-keyed pattern via a `runCase` dispatch helper and drops a dead `delayMs` reference the `single-flight-reruns-after-settle` scenario never actually carried. `examples/observedKeyedWorkGate.ts` drops redundant `static override create()` overrides on `TelemetryMutex`/`TelemetryCoalesce` so the base classes' polymorphic factory applies directly.

- 789da06: ### Fixed

  - `backoff-strategies.scenarios.json` drops the top-level `attempt`/`baseDelay` fields duplicated across 44 cases — `backoff-strategies.loop.spec.ts` reads `scenarioCase.input.attempt`/`.baseDelay` exclusively, so the top-level copies were inert.
  - `adaptive-config.scenarios.json` drops the top-level `value` field duplicated on the two `reject-non-positive-target-latency-*` cases — `adaptive-config.loop.spec.ts` never reads `scenarioCase.value`.
  - `LayerResolver.scenarios.json` drops the `input.operation` and `input.expect` fields duplicated/orphaned across all 14 cases. `LayerResolver.loop.spec.ts` dispatches on the top-level `operation` discriminator (`operations[scenario.operation]`), so the top-level field is the live one here — the inverse of the other two files — and `input.expect` is read nowhere at all.

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
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
  - @studnicky/circular-buffer@9.1.0
  - @studnicky/types@9.1.0
  - @studnicky/signal@9.1.0
  - @studnicky/config@9.1.0
  - @studnicky/errors@9.1.0
  - @studnicky/sample-buffer@9.1.0
  - @studnicky/json@9.1.0

## 9.0.0

### Major Changes

- d5be000: The package root is the sole public code entrypoint for throttle behavior, entities, errors, validators, and `ThrottleInterface`; scheduling constants remain implementation details. The `Throttle` constructor is protected; instances are created via `Throttle.create(config?)`. FSM state is exported as `ThrottleStateEntity.Type`; adaptive, configuration, statistics, and validation data remain schema-backed entity types, while runtime behavior is an interface. Runtime statistics are validated through `ThrottleStatsEntity.validate`.
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
- Updated dependencies [d5be000]
- Updated dependencies [d5be000]
- Updated dependencies [d5be000]
  - @studnicky/circular-buffer@9.0.0
  - @studnicky/config@9.0.0
  - @studnicky/errors@9.0.0
  - @studnicky/json@9.0.0
  - @studnicky/sample-buffer@9.0.0
  - @studnicky/types@9.0.0
  - @studnicky/signal@9.0.0

## 8.0.1

### Patch Changes

- The test estate uses the controlled test-suite harness for coverage and JSON-backed loop fixtures with `input.batch` fan-out configuration across package scenario suites.
- Updated dependencies
  - @studnicky/circular-buffer@8.0.1
  - @studnicky/config@8.0.1
  - @studnicky/errors@8.0.1
  - @studnicky/json@8.0.1
  - @studnicky/sample-buffer@8.0.1
  - @studnicky/signal@8.0.1
  - @studnicky/types@8.0.1

## 8.0.0

### Major Changes

- 837480d: The package root is the sole public code entrypoint for throttle behavior, entities, errors, validators, and `ThrottleInterface`; scheduling constants remain implementation details. The `Throttle` constructor is protected; instances are created via `Throttle.create(config?)`. FSM state is exported as `ThrottleStateEntity.Type`; adaptive, configuration, statistics, and validation data remain schema-backed entity types, while runtime behavior is an interface. Runtime statistics are validated through `ThrottleStatsEntity.validate`.
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
- Updated dependencies [837480d]
- Updated dependencies [837480d]
- Updated dependencies [837480d]
  - @studnicky/circular-buffer@8.0.0
  - @studnicky/config@8.0.0
  - @studnicky/errors@8.0.0
  - @studnicky/json@8.0.0
  - @studnicky/sample-buffer@8.0.0
  - @studnicky/types@8.0.0
  - @studnicky/signal@8.0.0

## 7.0.1

### Patch Changes

- @studnicky/circular-buffer@7.0.1
- @studnicky/config@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/sample-buffer@7.0.1
- @studnicky/signal@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/sample-buffer@7.0.0
  - @studnicky/circular-buffer@7.0.0
  - @studnicky/config@7.0.0
  - @studnicky/json@7.0.0
  - @studnicky/signal@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Throttle` class with configurable `concurrencyLimit` (default 10) and sliding window execution — queued operations start as soon as a slot is released.
- `execute<T>(fn)` returns `Promise<T | undefined>`; operations resolve with `undefined` when the throttle is aborted (detach-and-abandon pattern).
- `abort(options?)` cancels all queued and active operations immediately (or after a grace-period timeout), returning `AbortResultEntity.Type` with cancelled, completed, and timedOut counts.
- Optional adaptive concurrency via `AdaptiveConfigEntity.Type` automatically scales the concurrency limit up or down based on observed p95 latency.
