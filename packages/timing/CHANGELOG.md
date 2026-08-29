# Changelog

## 12.0.0

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/config@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

## 11.1.0

### Patch Changes

- Updated dependencies [44865fd]
  - @studnicky/types@11.1.0
  - @studnicky/config@11.1.0
  - @studnicky/errors@11.1.0
  - @studnicky/json@11.1.0

## 11.0.1

### Patch Changes

- Updated dependencies [92e7c65]
  - @studnicky/config@11.0.1
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
  - @studnicky/config@11.0.0
  - @studnicky/errors@11.0.0
  - @studnicky/json@11.0.0
  - @studnicky/types@11.0.0

## 10.0.0

### Major Changes

- 3e5575a: Rule behaviour is now derived from measurement, and abbreviated exported identifiers are
  expanded across every package.
  
  ## `@studnicky/eslint-config`
  
  Every rule claim is now backed by evidence recorded in the rule source, and rule identity
  is resolved through the TypeScript checker rather than matched on spelling.
  
  **Rules whose premise was disproven and retargeted.** Measured at 5,000,000 elements:
  `dynamic-property-access` now targets variable keys on plain objects only — literal keys
  compile to the same `GetNamedProperty` bytecode as dot access, and indexed access lands in
  the elements store without touching the hidden class. `memoize-array-length` keeps only its
  reassignment check (memoizing measured 1.40x *slower*). `try-catch-in-loops` and
  `switch-statements` keep their constraints but drop the `v8Optimization/` framing —
  try/catch in a loop measures 1.007x, and delegated versus inlined 20-case switches emit
  identical `SwitchOnSmiNoFeedback` bytecode. `define-property` targets redefinition and
  accessor descriptors (15.8x on reads) rather than fresh definition, which produces an
  identical map. `array-from-iterators` is inverted: the manual drain it implied is 7.5x
  slower than `Array.from`. `max-switch-cases` splits by discriminant — dense integers get no
  cap, strings cap at 6.
  
  **Rules that were enforcing nothing.** `computed-class-properties` selected `Property`
  nodes, which never occur in a class body. Four `arch/*` rules, `no-mixed-callable-shapes`,
  and `descriptive-identifiers` were defined but never enabled.
  
  **Contradictions resolved.** Well-known symbols are exempt from the computed-property
  rules — `Symbol.iterator` has no non-computed spelling, so flagging it made an iterable
  unimplementable. `inline-trivial-logic` exempts a function passed as a call argument: such
  a callback is a deferred computation, and "inline it at the call site" would convert lazy
  evaluation to eager. `lexical-this-only` permits `this` as a constructor reference in
  static context while denying every escape from an instance method.
  
  **All three autofixers are removed.** `clean-diagnostics` deleted code — its range ran from
  the comment start to end-of-line, so an inline block comment took the rest of the line with
  it. `type-alias-invariants` stripped `readonly`, which typechecks and therefore silently
  converts an immutability guarantee into permitted mutation. `explicit-return-binding` bound
  returned expressions to a `const`, stripping contextual typing. An autofixer is permitted
  only where it cannot break the build or change program meaning.
  
  **New rule** `explicit-return-binding` requires a returned operation to be bound to a
  `const` first.
  
  ### Breaking for `@studnicky/eslint-config` consumers
  
  Rule behaviour changes throughout: code that passed may now report, and vice versa. The
  `require-options-object` option `minOptionals` is renamed `minimumOptionals`, and the rule
  module `maxSwitchCases` is renamed `maximumSwitchCases`.
  
  ## Exported identifier expansion
  
  Every exported symbol carrying an abbreviation is renamed, and its module filename follows,
  because `single-export` requires a file's basename to match the symbol it exports. No
  deprecated aliases are provided.
  
  ```
  DEFAULT_BATCH_MAX_CONCURRENT   -> DEFAULT_BATCH_MAXIMUM_CONCURRENT
  DomainErrorArgs                -> DomainErrorArgumentList
  ValidateParams                 -> ValidateParameters
  QueryParamsInterface           -> QueryParametersInterface
  ValidatorFnInterface           -> ValidatorCallbackInterface
  UrlUtils                       -> UrlQueryString
  MAX_PIPELINING                 -> MAXIMUM_PIPELINING
  MAX_DISPATCHER_CONNECTIONS     -> MAXIMUM_DISPATCHER_CONNECTIONS
  ResolveMinLevel                -> ResolveMinimumLevel
  NumCtxTypeEntity               -> NumberContextTypeEntity
  StepCtxTypeEntity              -> StepContextTypeEntity
  DlqAbortedError                -> DeadLetterQueueAbortedError
  DlqClosedError                 -> DeadLetterQueueClosedError
  DlqFullError                   -> DeadLetterQueueFullError
  DlqEntryMetadataEntity         -> DeadLetterQueueEntryMetadataEntity
  DlqEntryInterface              -> DeadLetterQueueEntryInterface
  DEFAULT_MAX_RETRIES            -> DEFAULT_MAXIMUM_RETRIES
  MaxRetriesExceededError        -> MaximumRetriesExceededError
  PERCENTILE_MAX                 -> PERCENTILE_MAXIMUM
  MIN_RETRY_DELAY_MS             -> MINIMUM_RETRY_DELAY_MS
  MIN_SAMPLE_WINDOW              -> MINIMUM_SAMPLE_WINDOW
  MIN_ADJUSTMENT_INTERVAL        -> MINIMUM_ADJUSTMENT_INTERVAL
  MIN_CONCURRENCY_LIMIT          -> MINIMUM_CONCURRENCY_LIMIT
  DEFAULT_MAX_EVENTS             -> DEFAULT_MAXIMUM_EVENTS
  MAX_PRECISION                  -> MAXIMUM_PRECISION
  ```
  
  Consumers importing any of these must update both the imported name and, where they
  deep-import, the module path.
  
  ## `@studnicky/predicates` removes `satisfiesConst`
  
  `Predicates.satisfiesConst` is removed. It forwarded 1:1 to `DataType.deepEqual` and added no
  behaviour of its own — the JSON Schema `const` keyword IS deep equality.
  
  Consumers call `DataType.deepEqual(value, constantValue)` from `@studnicky/json` directly, which
  requires declaring `@studnicky/json` as a dependency; `@studnicky/predicates` does not re-export
  it. The semantics are unchanged, and `@studnicky/json` already owns the tests for them.
  
  The rest of the `satisfies*` family — `satisfiesEnum`, `satisfiesMinimum`, `satisfiesContains`
  and the others — is unaffected. Each of those applies logic of its own beyond a forward.
  
  ## `@studnicky/errors` cause installation
  
  `BaseError` installs an own `cause` property only when a cause is actually supplied. `Error`
  installs `cause` whenever the options object HAS the key, regardless of its value, so passing
  `{ 'cause': undefined }` created an own `cause` holding `undefined`. Both spellings leave
  `error.cause === undefined` and no consumer can read them apart, but the first forced any
  subclass wanting a cause-free instance to `delete` the property — which drops every instance of
  that subclass into dictionary mode.
  
  Measured at 2,000,000 instances: the deletion costs 7.2x on property reads (300.6ms against
  41.8ms) and `%HasFastProperties` reports false. Constructing the options object conditionally
  splits the error family into two hidden classes, which measures free (13.8ms bimorphic against
  15.2ms monomorphic) because inline caches stay polymorphic well past two shapes.
  
  `RetryError` consequently drops its `Reflect.deleteProperty(this, 'cause')`, keeping its
  detached-projection contract with no property to remove.
  
  Consumers reading `error.cause` are unaffected. Code testing for the property's PRESENCE —
  `'cause' in error` or `Object.hasOwn(error, 'cause')` — now reports `false` on an error
  constructed without a cause, where it previously reported `true`.
  
  ## `@studnicky/worker-pool` path resolution
  
  Worker paths were built with `new URL(path, import.meta.url).pathname`, which returns the
  URL-ENCODED path. Any directory containing a space resolved to a `%20` filename that does
  not exist, so the worker never started and callers hung until they timed out. The package
  README and public API example taught consumers the same broken pattern. All call sites now
  use `fileURLToPath()`.
  
  Consumers who copied the README example should switch to
  `fileURLToPath(new URL('./worker.mjs', import.meta.url))`. The old form silently fails on
  any path containing a space, which is routine on macOS.
  
  ## Security
  
  All 17 outstanding advisories are cleared. The one reaching consumers was `undici`
  8.8.0 to 8.10.0, a runtime dependency of `@studnicky/fetch` carrying one high and four
  moderate advisories.
  
  `pnpm.overrides` carries one entry where it previously carried seven. An override applies to
  every resolution in the graph regardless of what a dependent declares, so it is kept only where
  no dependency bump reaches the fix. Six were removed after verifying, against GitHub's advisory
  database at the exact version natural resolution selects, that each resolves clean without the
  pin: `brace-expansion` 5.0.9, `dompurify` 3.4.14, `fast-uri` 3.1.6, `nanoid` 3.3.18, `postcss`
  8.5.26, and `esbuild`.
  
  The `esbuild` pin was also incorrect. `tsx` declares `~0.28.0`, and the unconditional override
  served it 0.25.12 — three minors below its own declared floor, in the loader the whole test
  suite runs under. Both `tsx` and `vite` now resolve inside their declared ranges.
  
  `vite: ^6.4.3` remains, and `SECURITY.md` records why: `vitepress` 1.6.4 is the latest stable
  release, it declares `vite: ^5.4.14`, and the vite 5.x line carries an unfixed HIGH
  (GHSA-fx2h-pf6j-xcff) whose fix ships only in 6.4.3. None of this affects published package
  contents — the toolchain is a docs-build devDependency.

### Patch Changes

- Updated dependencies [3e5575a]
  - @studnicky/errors@10.0.0
  - @studnicky/json@10.0.0
  - @studnicky/config@10.0.0

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

  - `@studnicky/logger`'s `Logger.create()`, `ConsoleTransport.create()`, `MemoryTransport.create()`, `NoOpTransport.create()`, and `FunctionTransport.create()` return the invoking subclass's own type instead of the base class. Each already constructed the subclass at runtime via `new this(...)`; the factory now types its `this` parameter and constructs through `Reflect.construct`, so `MySubclass.create(...)` types as `MySubclass` and a subclass member is readable without a cast. A runtime guard throws a `TypeError` naming the factory if construction ever yields an instance outside the requested subclass's prototype chain. Calling `Base.create(...)` directly is unaffected — it still types as `Base`.
  - `@studnicky/clock`'s `Clock.create()`, `RealTimeClockProvider.create()`, `VirtualClockProvider.create()`, and `VirtualTimeCounter.create()` follow the same subclass-return pattern.
  - `@studnicky/timing`'s `Timing.create()` and `NoOpTiming.create()` follow the same subclass-return pattern.

### Patch Changes

- 789da06: ### Fixed

  - `Clock`, `RealTimeClockProvider`, `VirtualClockProvider`, `VirtualTimeCounter`, `MemoryTransport`, `NoOpTransport`, and `NoOpTiming` each carry their class documentation on the class again. The module-local `…SubclassInterface` and `…Instance` helpers their factories rely on sat between the doc comment and the class it describes, so the generated API reference attributed each class's summary and usage example to a non-exported helper interface and left the exported class undocumented. The helpers now precede the doc comment.

- 789da06: ### Fixed

  - `logger`'s `Logger.scenarios.json` suite and `Logger.loop.spec.ts` drop the `expected.asserted: true` tautology from every case — each case's preceding behavioral assertions already prove the scenario. `LogEventName`'s `component-prefixes` case drops the redundant self-comparison of `input.components` against `expected.components` (and now also asserts `EVENT_COMPONENTS.TIMING`, the one component prefix the case previously left unchecked). `LogStatus.scenarios.json` drops the `input.values` field, which duplicated `expected.values` and was never read by the spec.
  - `circular-buffer`'s `CircularBuffer.scenarios.json` drops `shift-never-pushed-returns-undefined`, a verbatim duplicate of `shift-empty-returns-undefined`. `CircularBuffer.subclass.scenarios.json`'s `onEvict-called-with-evicted-item` now drives a longer five-push eviction chain distinct from `create-returns-subclass`, proving FIFO eviction order across three evictions instead of duplicating the same single-eviction fixture.
  - `fsm`'s `plain-error-wraps` scenario now throws a non-`Error` primitive from the reducer and asserts the resulting `ReducerThrewError`'s `cause` and the hook-observed `reason` string, exercising `StateMachine`'s `String(cause)` fallback — previously indistinguishable from `wraps-reducer-throw`, which throws a real `Error` and only exercised the `cause.message` branch.
  - `file-lock`'s `entities.scenarios.json` adds coverage for `FileLockOptionsEntity`'s previously-unexercised rejection branches: empty `path`, non-positive `pollMs`/`timeoutMs`, and an unexpected extra property under `additionalProperties: false`.
  - `timing`'s `immediate-operations` spec drops its upper-bound assertions (`durationMs < 5`, event elapsed `< 5`) taken from two back-to-back `process.hrtime()` reads with no busy-wait spacer — the fragile direction under load. It now asserts non-negativity only, matching every sibling case's lower-bound-only pattern.
  - `scheduler`'s `chained-timeout-fire` and `chained-timeout-cancel` specs no longer arm real `setTimeout` stages against a fixed wall-clock buffer. They drive `RealTimeScheduler`'s multi-stage chain deterministically via `node:test`'s `mock.timers` (mocking `Date` and `setTimeout`), ticking virtual time forward one `maxTimeoutDelayMs` stage at a time and cancelling mid-chain, eliminating the wall-clock margin entirely rather than widening it.

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
  - @studnicky/config@9.1.0
  - @studnicky/errors@9.1.0
  - @studnicky/json@9.1.0

## 9.0.0

### Major Changes

- d5be000: `Timing.create(options?)` and `NoOpTiming.create()` are the only public construction paths for timing trackers. `TimingEvent.create(config)` creates frozen event data in one step from required `component` and `operation` fields plus optional `status`. Time units and timing statuses are exported as `TimeUnitEntity.Type` and `TimingStatusEntity.Type`; event and runtime contracts are interfaces. `@studnicky/timing` is the sole public code entrypoint and exports `TimingInterface`.
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

- 837480d: `Timing.create(options?)` and `NoOpTiming.create()` are the only public construction paths for timing trackers. `TimingEvent.create(config)` creates frozen event data in one step from required `component` and `operation` fields plus optional `status`. Time units and timing statuses are exported as `TimeUnitEntity.Type` and `TimingStatusEntity.Type`; event and runtime contracts are interfaces. `@studnicky/timing` is the sole public code entrypoint and exports `TimingInterface`.
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

- `Timing` tracker with configurable `maxEvents` cap (LRU eviction) and `precision` options for nanosecond-resolution elapsed time output.
- `TimingEvent` factory producing structured `component.operation[.status]` event names for consistent metric keys across instrumented code.
- `TIMING_STATUS` constants covering the full lifecycle vocabulary (`start`, `complete`, `error`, `timeout`, `hit`, `miss`, `queued`, `dequeued`, `waiting`, `acquired`, `released`, `abort`).
- `NoOpTiming` implementation satisfying `TimingInterface` with zero overhead — suitable for test contexts and production code paths where timing collection is disabled.
- Protected `readHrtime()` and `onEvent()` override seams on `Timing` for deterministic testing and instrumentation without altering the public API.
