# Changelog

## 12.0.0

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

## 11.1.0

### Patch Changes

- Updated dependencies [44865fd]
  - @studnicky/types@11.1.0
  - @studnicky/errors@11.1.0
  - @studnicky/json@11.1.0

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

## 9.2.0

### Patch Changes

- Version bump only — no functional changes. Released in lockstep with the fixed-package group.

## 9.1.1

### Patch Changes

- @studnicky/errors@9.1.1
- @studnicky/json@9.1.1

## 9.1.0

### Patch Changes

- 789da06: ### Fixed

  - `logger`'s `logger-primitive-contracts.loop.spec.ts`, `LogEventName.loop.spec.ts`, `LogStatus.loop.spec.ts`, and `Logger.loop.spec.ts` type their scenario runner maps with the `Extract<ScenarioCase, { shape: K }>`-keyed generic form instead of a flat `Record<ScenarioCase['shape'], (c: ScenarioCase) => void>`, so each runner narrows to its own case fields instead of the full union. `LogFault`'s scenario fixture input is split into a fully-optional variant for the deliberately-incomplete `log-fault-missing-field` case and a required-field variant for the three complete fault fixtures, matching what `LogFault.create()` actually requires. `LogEventName.scenarios.json` and `LogStatus.scenarios.json`'s cases gain the `name` field on their `ScenarioCase` type. `observedLogger.ts`'s `ObservedLogger.events` getter returns `readonly LogEventInterface[]`, matching `EventRecorder`'s readonly accessor.
  - `health-registry`'s `HealthRegistry.loop.spec.ts` and `HealthRegistryHooks.loop.spec.ts` adopt the same `Extract`-keyed runner map pattern. `HealthRegistryHooks.scenarios.json`'s `on-aggregate-after-settle` case's `ScenarioCase` type is corrected to `aggregateCountAfterFirst`/`aggregateCountAfterSecond`, matching the fixture and the assertions that already read those fields. `observedHealthRegistry.ts`'s inline health checks are `async`, matching `HealthCheckInterface`'s `Promise`-returning contract.
  - `request-executor`'s `request-executor.loop.spec.ts` adopts the same `Extract`-keyed runner map pattern, drops an unresolvable `RequestInfo` type reference in favor of contextual inference from `typeof fetch`, guards `RequestInit.signal` against `null` alongside `undefined`, and constructs `TrackingFetchClient` through its own `static create()` instead of `new` against `FetchClient`'s protected constructor.
  - `worker-pool`'s `creation.loop.spec.ts`, `hooks.loop.spec.ts`, `run.loop.spec.ts`, `termination.loop.spec.ts`, and `timeout.loop.spec.ts` adopt the same `Extract`-keyed runner map pattern. Local `Signal` and `WorkerPool` test subclasses that relied on the inherited `protected` constructor now declare their own `public constructor()`. `timeout.loop.spec.ts`'s `AbortedSignal` overrides `compose()` at its declared public visibility instead of narrowing it to `protected`. `pooling.loop.spec.ts` and `run.loop.spec.ts` assert `workerPool.concurrency` is defined before comparing against it, and `run.loop.spec.ts`'s `resolvePoolConfig` only sets `concurrency` on the resolved config when the input provides one, avoiding an explicit `undefined` under `exactOptionalPropertyTypes`.

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
  - @studnicky/errors@9.1.0
  - @studnicky/json@9.1.0

## 9.0.0

### Major Changes

- d5be000: `HealthCheckOptionsEntity.Type` and `HealthStatusEntity.Type` are schema-derived data. `HealthCheckInterface`, `HealthCheckResultInterface`, and `HealthEvaluationInterface` define callable and runtime contracts.
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
  - @studnicky/errors@9.0.0
  - @studnicky/json@9.0.0

## 8.0.1

### Patch Changes

- The test estate uses the controlled test-suite harness for coverage and JSON-backed loop fixtures with `input.batch` fan-out configuration across package scenario suites.
- Updated dependencies
  - @studnicky/errors@8.0.1
  - @studnicky/json@8.0.1

## 8.0.0

### Major Changes

- 837480d: `HealthCheckOptionsEntity.Type` and `HealthStatusEntity.Type` are schema-derived data. `HealthCheckInterface`, `HealthCheckResultInterface`, and `HealthEvaluationInterface` define callable and runtime contracts.
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
  - @studnicky/errors@8.0.0
  - @studnicky/json@8.0.0

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Minor Changes

- d2b44b7: `@studnicky/errors` exports `HookInvoker`, a composable delegate for safely invoking consumer-supplied lifecycle hooks — synchronous or asynchronous, without forcing async contagion on a synchronous caller and without letting a broken hook produce an unhandled rejection. A class composes it as a field (never extends it directly) and calls `invoke(hookName, fn)` from its own methods; a caller needing a different failure disposition than the default throw defines a small delegate subclass overriding `onHookError`. Also exports `HookInvocationError`, `HookTimeoutError` (thrown when an optional `timeoutMs` elapses before a hook settles), and `ReentrantHookInvocationError` (thrown when `detectReentrancy` catches a synchronous same-call-stack reentrant `invoke`).

  `@studnicky/entity-store`, `@studnicky/file-lock`, `@studnicky/health-registry`, and `@studnicky/worker-pool` route their lifecycle hooks through a record-and-continue `HookInvoker` delegate: a throwing hook override no longer aborts or corrupts an in-flight operation — the failure is recorded instead, inspectable via `hookErrorCount`/`getHookErrors()` (`getHookErrorCount()`/`getHookErrors()` on `WorkerPool`).

  `@studnicky/logger`'s `Logger` composes a plain `HookInvoker` for `onLog`/`onDropped`/`onChildCreate` (unchanged throwing behavior) and separately guards `onTransportError`, recording its failures via `hookErrorCount`/`getHookErrors()` so a broken override can't abort fan-out to the remaining transports.

  `@studnicky/retry` and `@studnicky/pipeline` gain a `hookTimeoutMs` builder option (and matching `Retry.create`/`Pipeline.create` config field) bounding how long an async lifecycle hook may run before it's routed to `onHookError` with a `HookTimeoutError` cause. Left unset, a hook may take arbitrarily long, matching prior behavior.

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-08

### Added

- `HealthRegistry` class: named async health-check registry via `register()`/`unregister()`/`has()`/`list()`/`evaluate()`, aggregating every check into one overall `'healthy' | 'degraded' | 'unhealthy'` status.
- `evaluate()` runs all registered checks in parallel via `Promise.allSettled`. Each configured `timeoutMs` uses a local timer raced against that check with `Promise.race`; a rejection or timeout becomes an `'unhealthy'` result without interrupting the other checks.
- Protected observability hooks `onCheckRegistered`, `onCheckResult`, `onCheckTimeout`, and `onAggregate` for logging/tracing/metrics via subclassing.
- `HealthCheckOptionsEntity`, `HealthStatusEntity`, `HealthCheckInterface`, `HealthCheckResultInterface`, and `HealthEvaluationInterface` are exported from the package root.
