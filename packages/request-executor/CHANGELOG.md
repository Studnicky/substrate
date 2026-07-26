# Changelog

## 9.1.0

### Minor Changes

- 789da06: ### Changed

  - `RequestExecutor` composes `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, and `@studnicky/context`. `timing` is not a field on `RequestExecutorConfigInterface` or `RequestExecutorDepsInterface`, and `package.json` carries no `@studnicky/timing` dependency.

  ### Added

  - `RequestExecutor` exposes three protected lifecycle hooks bracketing the retry loop: `onExecuteStart()`, `onExecuteComplete<T>(result)`, and `onExecuteError(error)`. All three are no-ops by default and run through an internal `HookInvoker` that swallows a throwing override — a rejected hook is recorded via `hookErrorCount`/`getHookErrors()` but never replaces `execute()`'s resolved result or thrown error.

### Patch Changes

- 789da06: ### Fixed

  - `logger`'s `logger-primitive-contracts.loop.spec.ts`, `LogEventName.loop.spec.ts`, `LogStatus.loop.spec.ts`, and `Logger.loop.spec.ts` type their scenario runner maps with the `Extract<ScenarioCase, { shape: K }>`-keyed generic form instead of a flat `Record<ScenarioCase['shape'], (c: ScenarioCase) => void>`, so each runner narrows to its own case fields instead of the full union. `LogFault`'s scenario fixture input is split into a fully-optional variant for the deliberately-incomplete `log-fault-missing-field` case and a required-field variant for the three complete fault fixtures, matching what `LogFault.create()` actually requires. `LogEventName.scenarios.json` and `LogStatus.scenarios.json`'s cases gain the `name` field on their `ScenarioCase` type. `observedLogger.ts`'s `ObservedLogger.events` getter returns `readonly LogEventInterface[]`, matching `EventRecorder`'s readonly accessor.
  - `health-registry`'s `HealthRegistry.loop.spec.ts` and `HealthRegistryHooks.loop.spec.ts` adopt the same `Extract`-keyed runner map pattern. `HealthRegistryHooks.scenarios.json`'s `on-aggregate-after-settle` case's `ScenarioCase` type is corrected to `aggregateCountAfterFirst`/`aggregateCountAfterSecond`, matching the fixture and the assertions that already read those fields. `observedHealthRegistry.ts`'s inline health checks are `async`, matching `HealthCheckInterface`'s `Promise`-returning contract.
  - `request-executor`'s `request-executor.loop.spec.ts` adopts the same `Extract`-keyed runner map pattern, drops an unresolvable `RequestInfo` type reference in favor of contextual inference from `typeof fetch`, guards `RequestInit.signal` against `null` alongside `undefined`, and constructs `TrackingFetchClient` through its own `static create()` instead of `new` against `FetchClient`'s protected constructor.
  - `worker-pool`'s `creation.loop.spec.ts`, `hooks.loop.spec.ts`, `run.loop.spec.ts`, `termination.loop.spec.ts`, and `timeout.loop.spec.ts` adopt the same `Extract`-keyed runner map pattern. Local `Signal` and `WorkerPool` test subclasses that relied on the inherited `protected` constructor now declare their own `public constructor()`. `timeout.loop.spec.ts`'s `AbortedSignal` overrides `compose()` at its declared public visibility instead of narrowing it to `protected`. `pooling.loop.spec.ts` and `run.loop.spec.ts` assert `workerPool.concurrency` is defined before comparing against it, and `run.loop.spec.ts`'s `resolvePoolConfig` only sets `concurrency` on the resolved config when the input provides one, avoiding an explicit `undefined` under `exactOptionalPropertyTypes`.

- 789da06: ### Changed

  - `@studnicky/fetch`'s `FetchClient.create()`, `TestDispatcher.create()`, and `UndiciDispatcher.create()` return the invoking subclass's own type instead of the base class. Each already constructed the subclass via `new this(...)`; the factory now types its `this` parameter and constructs through `Reflect.construct`, so `MySubclass.create(...)` types as `MySubclass` and a subclass member is readable without a cast. A runtime guard throws a `TypeError` naming the factory if construction ever yields an instance outside the requested subclass's prototype chain. Calling the base class's `create(...)` directly is unaffected.
  - `@studnicky/context`'s `Context.create()` and `@studnicky/throttle`'s `Throttle.create()` follow the same conversion. These were the last two factories in the workspace still declaring the base class as their return type.
  - Subclasses across `fetch`, `request-executor`, `context`, and `throttle` drop their `static override create()` declarations. Each hardcoded `new ConcreteClass(...)` to recover the subclass type from a base-typed factory — the per-subclass workaround this conversion makes redundant, and one a properly polymorphic `create()` can no longer be validly overridden by.

  `@studnicky/fetch`'s `DispatcherAgent.create()` and its browser counterpart are unchanged: they return a foreign type or throw, so they are not factories of their own class.

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
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
  - @studnicky/signal@9.1.0
  - @studnicky/errors@9.1.0
  - @studnicky/fetch@9.1.0
  - @studnicky/json@9.1.0
  - @studnicky/retry@9.1.0
  - @studnicky/context@9.1.0

## 9.0.0

### Major Changes

- d5be000: ### Added

  - `RequestExecutor` class composing `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, `@studnicky/timing`, and `@studnicky/context` into a one-shot request execution pattern: `execute(fn, options)` composes a cancellation signal, runs `fn` through the retry loop, optionally brackets the call with a `Timing` span, and optionally runs the whole call inside a `Context` scope.
  - `RequestExecutorConfigInterface` and `RequestExecutorExecuteOptionsInterface` public contracts.
  - `RequestExecutorDepsInterface` provides the resolved constructor contract for subclasses that explicitly own configured collaborators.

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
  - @studnicky/context@9.0.0
  - @studnicky/errors@9.0.0
  - @studnicky/fetch@9.0.0
  - @studnicky/json@9.0.0
  - @studnicky/retry@9.0.0
  - @studnicky/timing@9.0.0
  - @studnicky/signal@9.0.0

## 8.0.1

### Patch Changes

- The test estate uses the controlled test-suite harness for coverage and JSON-backed loop fixtures with `input.batch` fan-out configuration across package scenario suites.
- Updated dependencies
  - @studnicky/context@8.0.1
  - @studnicky/errors@8.0.1
  - @studnicky/fetch@8.0.1
  - @studnicky/json@8.0.1
  - @studnicky/retry@8.0.1
  - @studnicky/signal@8.0.1
  - @studnicky/timing@8.0.1

## 8.0.0

### Major Changes

- 837480d: ### Added

  - `RequestExecutor` class composing `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, `@studnicky/timing`, and `@studnicky/context` into a one-shot request execution pattern: `execute(fn, options)` composes a cancellation signal, runs `fn` through the retry loop, optionally brackets the call with a `Timing` span, and optionally runs the whole call inside a `Context` scope.
  - `RequestExecutorConfigInterface` and `RequestExecutorExecuteOptionsInterface` public contracts.
  - `RequestExecutorDepsInterface` provides the resolved constructor contract for subclasses that explicitly own configured collaborators.

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
  - @studnicky/context@8.0.0
  - @studnicky/errors@8.0.0
  - @studnicky/fetch@8.0.0
  - @studnicky/json@8.0.0
  - @studnicky/retry@8.0.0
  - @studnicky/timing@8.0.0
  - @studnicky/signal@8.0.0

## 7.0.1

### Patch Changes

- @studnicky/context@7.0.1
- @studnicky/fetch@7.0.1
- @studnicky/retry@7.0.1
- @studnicky/signal@7.0.1
- @studnicky/timing@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/retry@7.0.0
  - @studnicky/fetch@7.0.0
  - @studnicky/context@7.0.0
  - @studnicky/timing@7.0.0
  - @studnicky/signal@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
