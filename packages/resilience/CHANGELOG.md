# Changelog

## 9.2.0

### Patch Changes

- Version bump only — no functional changes. Released in lockstep with the fixed-package group.

## 9.1.1

### Patch Changes

- @studnicky/errors@9.1.1
- @studnicky/json@9.1.1
- @studnicky/signal@9.1.1
- @studnicky/types@9.1.1

## 9.1.0

### Minor Changes

- 789da06: ### Changed

  - `@studnicky/resilience`'s `CircuitBreaker.create()` and `TokenBucket.create()` return the invoking subclass's own type instead of the base class. Each already constructed the subclass at runtime via `new this(...)`; the factory now types its `this` parameter and constructs through `Reflect.construct`, so `MySubclass.create(...)` types as `MySubclass` and a subclass member is readable without a cast. A runtime guard throws a `TypeError` naming the factory if construction ever yields an instance outside the requested subclass's prototype chain. Calling `Base.create(...)` directly is unaffected — it still types as `Base`.
  - `@studnicky/scheduler`'s `MinimumHeap.create()`, `VirtualScheduler.create()`, and `RealTimeScheduler.create()` follow the same subclass-return pattern.
  - `@studnicky/concurrency`'s `Semaphore.create()` follows the same subclass-return pattern. `Channel.create<T>()` and `Coalesce.create<T>()` follow it too, with `TInstance` bounded by a new `ChannelShapeInterface`/`CoalesceShapeInterface` (each just the one public member — `close()`, `isInflight()` — that doesn't mention the class's own item-type parameter) rather than by `Channel<T>`/`Coalesce<T>` directly: binding to the class's own generic type forces the method's general, unconstrained `T` to satisfy the bound, which fails the moment `T` appears in a callback-shaped (contravariant) position. The narrower bound still proves the returned value is shaped like the base class, without that failure mode.
  - `@studnicky/event-bus`'s `BusQueue.create<T>()` and `EventBus.create<TTopicMap>()` follow the same shape-interface-bounded pattern (`BusQueueShapeInterface`/`EventBusShapeInterface`, each the type-parameter-independent `drain()`/`close()` members). `EventBus.loop.spec.ts`, `BusQueue.loop.spec.ts`, and `examples/observedEventBus.ts` drop twelve `static override create()` overrides that hardcoded `new ConcreteClass(...)` — the pre-existing per-subclass workaround this conversion makes redundant, and one a properly polymorphic `create()` can no longer be validly overridden by.
  - `@studnicky/memoize`'s `Memoize.create<TArgs, TResult>()` follows the same shape-interface-bounded pattern (`MemoizeShapeInterface`, just `clear()`, the one public member independent of `TArgs`/`TResult`) in place of the `TInstance extends Memoize<TArgs, TResult>` bound it carried since its own original conversion — that bound hit the identical failure the moment `TArgs` (a rest-tuple parameter of the memoized function, a callback-shaped position) was inferred from an unannotated callback. `memoize.loop.spec.ts` adds an explicit parameter type to four memoized-function literals that previously relied on inference collapsing correctly by accident.

- 789da06: ### Changed

  - `@studnicky/signal`'s `Signal.create()` returns the invoking subclass's own type instead of the base class, and constructs the invoking subclass at runtime. It previously hardcoded `new Signal()`, so `MySignal.create()` returned a base `Signal` — the subclass's lifecycle-hook overrides never ran. The factory now types its `this` parameter and constructs through `Reflect.construct`, so `MySignal.create()` both types and behaves as `MySignal`. A runtime guard throws a `TypeError` naming the factory if construction ever yields an instance outside the requested subclass's prototype chain. `Signal.create()` called on the base class is unaffected.
  - `@studnicky/resilience`'s `DeadLetterQueue.create()` follows the same conversion, with the identical runtime consequence: it hardcoded `new DeadLetterQueue<T>(options)`, so a subclass overriding `onEnqueue`, `onDequeue`, `onOverflow`, `onClose`, or `onAbort` was silently discarded by its own factory. `TInstance` is bounded by a new `DeadLetterQueueShapeInterface` (`abort()` and `close()` — the two public members that don't mention the queue's item type) rather than by `DeadLetterQueue<T>`, because binding to the class's own generic forces the method's unconstrained `T` to satisfy the bound and fails wherever `T` reaches a callback-shaped position.
  - `@studnicky/file-lock`'s `FileLock.create()` returns the invoking subclass's own type. It already constructed the subclass via `new this(...)`, so this is a type-level correction only: `LoggedLock.create(...)` now types as `LoggedLock`, and a subclass member is readable without a cast. The factory remains `async`, and acquisition still happens after construction so the instance's protected hooks fire during it.

  These factories are the only route to the protected lifecycle hooks each class documents as its extension point, so a factory that discarded the subclass contradicted the extension path.

### Patch Changes

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

  - `event-bus`'s `on-drop-noop` spec publishes to a subscriber whose queue is already aborted and asserts the observed `onDrop` event, instead of closing two buses without ever calling `publish()`.
  - `resilience`'s `resilience-tokenbucket-wait-refill` spec asserts `completed` is still `false` immediately after a clock tick that is insufficient to refill a token, then asserts `bucket.available` after the wait resolves, instead of only checking a flag set inside the very promise being awaited.
  - `cache`'s `delete-where-none` spec uses a real value-derived predicate over non-matching entries, instead of a predicate that ignores its `(key, value)` arguments and returns a hardcoded `false`. `invalid-options` asserts `instanceof CacheConfigError` as the primary check instead of exact Ajv-generated message prose.
  - `keyed-rate-limiter`'s `throwing-on-key-evicted` spec tracks and asserts the same `created`/`evicted` key sequence as its non-throwing sibling scenarios, instead of only asserting a hardcoded `completed` flag.
  - `flag-evaluator`'s `half-rollout` spec derives its diversity check from live `evaluate()` results captured during the loop, instead of reading the fixture's own hardcoded `result` fields. `invalid-rollout-range` asserts `instanceof FlagDefinitionValidationError` instead of raw Ajv default wording.
  - `paginator`'s `discriminant-narrowing` spec drives a real `Paginator` through `next()`/`reset()` and asserts on `.pages`/`hasNext()`, instead of comparing spec-local helper functions against their own hardcoded output without exercising any `Paginator` source.

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
  - @studnicky/types@9.1.0
  - @studnicky/signal@9.1.0
  - @studnicky/errors@9.1.0
  - @studnicky/json@9.1.0

## 9.0.0

### Major Changes

- d5be000: ### Changed

  - `CircuitBreaker.reset()` is the single operation that restores the closed state.
  - `@studnicky/resilience` is the sole public code entrypoint.

  ### Added

  - `CircuitBreaker.create(options)`, `DeadLetterQueue.create(options)`, `TokenBucket.create(options)`, and `DeadLetterQueueRetryGenerator.create(options)` construct instances through protected constructors.
  - Entity declarations use direct `JSONSchema` and `FromSchema` imports from `json-schema-to-ts` and direct `ValidateFunction` imports from `ajv`.
  - `CircuitBreaker`, `DeadLetterQueue`, `DeadLetterQueueRetryGenerator`, and `TokenBucket` compose instance-local `HookInvoker` objects as the sole owners of hook-failure diagnostics. The primitives retain their swallow disposition without duplicate owner storage or public diagnostic facades.

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
  - @studnicky/signal@9.0.0

## 8.0.1

### Patch Changes

- The test estate uses the controlled test-suite harness for coverage and JSON-backed loop fixtures with `input.batch` fan-out configuration across package scenario suites.
- Updated dependencies
  - @studnicky/errors@8.0.1
  - @studnicky/json@8.0.1
  - @studnicky/signal@8.0.1
  - @studnicky/types@8.0.1

## 8.0.0

### Major Changes

- 837480d: ### Changed

  - `CircuitBreaker.reset()` is the single operation that restores the closed state.
  - `@studnicky/resilience` is the sole public code entrypoint.

  ### Added

  - `CircuitBreaker.create(options)`, `DeadLetterQueue.create(options)`, `TokenBucket.create(options)`, and `DeadLetterQueueRetryGenerator.create(options)` construct instances through protected constructors.
  - Entity declarations use direct `JSONSchema` and `FromSchema` imports from `json-schema-to-ts` and direct `ValidateFunction` imports from `ajv`.
  - `CircuitBreaker`, `DeadLetterQueue`, `DeadLetterQueueRetryGenerator`, and `TokenBucket` compose instance-local `HookInvoker` objects as the sole owners of hook-failure diagnostics. The primitives retain their swallow disposition without duplicate owner storage or public diagnostic facades.

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
  - @studnicky/signal@8.0.0

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/signal@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors use `@studnicky/errors`'s `DomainErrorArgs.build()`. Fluent builders assemble options through `@studnicky/types`'s `PickDefined.from()`. `@studnicky/fetch` config validators subclass `@studnicky/config`'s `ConfigValidation`. Shared ESLint rule AST helpers reside under `@studnicky/eslint-config`'s `rules/shared/`.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/json@7.0.0
  - @studnicky/signal@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `CircuitBreaker` with closed/open/halfOpen state machine, injectable clock, configurable `failureThreshold`, `resetTimeoutMs`, and `successThreshold`. `CircuitBreakerOpenError` thrown when the circuit is open.
- `TokenBucket` rate limiter with `consume()` (throws `TokenBucketExhaustedError` when exhausted) and `waitForToken()` async variant with `AbortSignal` support. Injectable clock for deterministic testing.
- `DeadLetterQueue` bounded FIFO queue with async-generator `drain()`, `close()`, `abort()`, and `AbortSignal` integration. `DlqFullError`, `DlqClosedError`, and `DlqAbortedError` for failure cases.
- `DeadLetterQueueRetryGenerator` wraps a `DeadLetterQueue` and re-yields entries at a configurable `intervalMs`.
