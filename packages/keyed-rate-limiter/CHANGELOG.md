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
  - @studnicky/cache@11.0.0
  - @studnicky/errors@11.0.0
  - @studnicky/json@11.0.0
  - @studnicky/resilience@11.0.0
  - @studnicky/types@11.0.0

## 10.0.0

### Patch Changes

- Updated dependencies [3e5575a]
  - @studnicky/errors@10.0.0
  - @studnicky/resilience@10.0.0
  - @studnicky/json@10.0.0
  - @studnicky/cache@10.0.0

## 9.2.0

### Patch Changes

- Version bump only — no functional changes. Released in lockstep with the fixed-package group.

## 9.1.1

### Patch Changes

- @studnicky/cache@9.1.1
- @studnicky/errors@9.1.1
- @studnicky/json@9.1.1
- @studnicky/resilience@9.1.1

## 9.1.0

### Minor Changes

- 789da06: ### Changed

  - `@studnicky/visible-range`'s `VisibleRange.create()`, `@studnicky/virtual-fs`'s `VirtualFileSystem.create()`, `@studnicky/sliding-window-limiter`'s `SlidingWindowLimiter.create()`, `@studnicky/sample-buffer`'s `SampleBuffer.create()`, `@studnicky/retry`'s `Retry.create()`, `@studnicky/batch`'s `Batch.create()`, `@studnicky/cache`'s `LruCache.create()`, `@studnicky/boundary-kit`'s `BoundaryKit.create()`, `@studnicky/entity-store`'s `EntityStore.create()`, `@studnicky/idempotency-guard`'s `IdempotencyGuard.create()`, `@studnicky/mutex`'s `Mutex.create()`, `@studnicky/keyed-work-gate`'s `KeyedWorkGate.create()`, and `@studnicky/bounded-dispatcher`'s `BoundedDispatcher.create()` return the invoking subclass's own type instead of the base class. Each already constructed the subclass at runtime via `new this(...)`; the factory now types its `this` parameter and constructs through `Reflect.construct`, so `MySubclass.create(...)` types as `MySubclass` and a subclass member is readable without a cast. A runtime guard throws a `TypeError` naming the factory if construction ever yields an instance outside the requested subclass's prototype chain. Calling `Base.create(...)` directly is unaffected — it still types as `Base`.
  - `@studnicky/keyed-rate-limiter`'s `KeyedRateLimiter.create()` follows the same subclass-return pattern across all three overloads (the default `TokenBucket` configuration signature, the generic strategy signature, and the implementation signature). Its `keyed-rate-limiter.loop.spec.ts` suite drops the five `as TrackingLimiter`/`as TrackingEvictionLimiter`/`as ThrowingEvictedLimiter` return-type casts that existed only because the factory wasn't polymorphic.

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
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
  - @studnicky/errors@9.1.0
  - @studnicky/json@9.1.0
  - @studnicky/resilience@9.1.0
  - @studnicky/cache@9.1.0

## 9.0.0

### Major Changes

- d5be000: `KeyedRateLimiter<TStrategy>` class composing `@studnicky/cache` (`LruCache`) and `@studnicky/resilience` (`TokenBucket`) into a per-key rate-limiting pattern: one strategy instance lazily created per key, idle keys evicted via LRU+TTL.

  `RateLimiterStrategyInterface` — the structural seam (`consume(tokens?)` / `waitForToken(options?)`) `TokenBucket` matches without declaring it, and a future `SlidingWindowLimiter` (or any other algorithm) can slot into `create()` without a second wrapper class.

  `KeyedRateLimiter.create(config)` accepts either the default `TokenBucket`-per-key configuration or a generic `RateLimiterStrategyInterface` factory configuration.

  `consume(key, tokens?)` / `waitForToken(key, options?)` public API, lazily creating the per-key strategy on first use.

  Protected lifecycle hooks (`onKeyCreated`, `onKeyEvicted`, `onLimitExceeded`, `onTokenAcquired`) — `onKeyEvicted` delegates from the internal `LruCache`'s own `onEvict`/`onExpire`/`onDelete` hooks. `onTokenAcquired` delegates from the per-key `TokenBucket` hook only for the default configuration because an arbitrary strategy has no structural hook surface.

  `KeyedRateLimiterConfigError`, extending the package-local `KeyedRateLimiterError` base.

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
  - @studnicky/cache@9.0.0
  - @studnicky/errors@9.0.0
  - @studnicky/json@9.0.0
  - @studnicky/resilience@9.0.0

## 8.0.1

### Patch Changes

- The test estate uses the controlled test-suite harness for coverage and JSON-backed loop fixtures with `input.batch` fan-out configuration across package scenario suites.
- Updated dependencies
  - @studnicky/cache@8.0.1
  - @studnicky/errors@8.0.1
  - @studnicky/json@8.0.1
  - @studnicky/resilience@8.0.1

## 8.0.0

### Major Changes

- 837480d: `KeyedRateLimiter<TStrategy>` class composing `@studnicky/cache` (`LruCache`) and `@studnicky/resilience` (`TokenBucket`) into a per-key rate-limiting pattern: one strategy instance lazily created per key, idle keys evicted via LRU+TTL.

  `RateLimiterStrategyInterface` — the structural seam (`consume(tokens?)` / `waitForToken(options?)`) `TokenBucket` matches without declaring it, and a future `SlidingWindowLimiter` (or any other algorithm) can slot into `create()` without a second wrapper class.

  `KeyedRateLimiter.create(config)` accepts either the default `TokenBucket`-per-key configuration or a generic `RateLimiterStrategyInterface` factory configuration.

  `consume(key, tokens?)` / `waitForToken(key, options?)` public API, lazily creating the per-key strategy on first use.

  Protected lifecycle hooks (`onKeyCreated`, `onKeyEvicted`, `onLimitExceeded`, `onTokenAcquired`) — `onKeyEvicted` delegates from the internal `LruCache`'s own `onEvict`/`onExpire`/`onDelete` hooks. `onTokenAcquired` delegates from the per-key `TokenBucket` hook only for the default configuration because an arbitrary strategy has no structural hook surface.

  `KeyedRateLimiterConfigError`, extending the package-local `KeyedRateLimiterError` base.

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
  - @studnicky/cache@8.0.0
  - @studnicky/errors@8.0.0
  - @studnicky/json@8.0.0
  - @studnicky/resilience@8.0.0

## 7.0.1

### Patch Changes

- @studnicky/cache@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/resilience@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/errors@7.0.0
  - @studnicky/resilience@7.0.0
  - @studnicky/cache@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
