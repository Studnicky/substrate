# Changelog

## 11.1.0

### Patch Changes

- Updated dependencies [44865fd]
  - @studnicky/types@11.1.0
  - @studnicky/errors@11.1.0
  - @studnicky/json@11.1.0

## 11.0.1

### Patch Changes

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

## 9.2.0

### Patch Changes

- Version bump only — no functional changes. Released in lockstep with the fixed-package group.

## 9.1.1

### Patch Changes

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

  - `logger`'s `logger-primitive-contracts.loop.spec.ts`, `LogEventName.loop.spec.ts`, `LogStatus.loop.spec.ts`, and `Logger.loop.spec.ts` type their scenario runner maps with the `Extract<ScenarioCase, { shape: K }>`-keyed generic form instead of a flat `Record<ScenarioCase['shape'], (c: ScenarioCase) => void>`, so each runner narrows to its own case fields instead of the full union. `LogFault`'s scenario fixture input is split into a fully-optional variant for the deliberately-incomplete `log-fault-missing-field` case and a required-field variant for the three complete fault fixtures, matching what `LogFault.create()` actually requires. `LogEventName.scenarios.json` and `LogStatus.scenarios.json`'s cases gain the `name` field on their `ScenarioCase` type. `observedLogger.ts`'s `ObservedLogger.events` getter returns `readonly LogEventInterface[]`, matching `EventRecorder`'s readonly accessor.
  - `health-registry`'s `HealthRegistry.loop.spec.ts` and `HealthRegistryHooks.loop.spec.ts` adopt the same `Extract`-keyed runner map pattern. `HealthRegistryHooks.scenarios.json`'s `on-aggregate-after-settle` case's `ScenarioCase` type is corrected to `aggregateCountAfterFirst`/`aggregateCountAfterSecond`, matching the fixture and the assertions that already read those fields. `observedHealthRegistry.ts`'s inline health checks are `async`, matching `HealthCheckInterface`'s `Promise`-returning contract.
  - `request-executor`'s `request-executor.loop.spec.ts` adopts the same `Extract`-keyed runner map pattern, drops an unresolvable `RequestInfo` type reference in favor of contextual inference from `typeof fetch`, guards `RequestInit.signal` against `null` alongside `undefined`, and constructs `TrackingFetchClient` through its own `static create()` instead of `new` against `FetchClient`'s protected constructor.
  - `worker-pool`'s `creation.loop.spec.ts`, `hooks.loop.spec.ts`, `run.loop.spec.ts`, `termination.loop.spec.ts`, and `timeout.loop.spec.ts` adopt the same `Extract`-keyed runner map pattern. Local `Signal` and `WorkerPool` test subclasses that relied on the inherited `protected` constructor now declare their own `public constructor()`. `timeout.loop.spec.ts`'s `AbortedSignal` overrides `compose()` at its declared public visibility instead of narrowing it to `protected`. `pooling.loop.spec.ts` and `run.loop.spec.ts` assert `workerPool.concurrency` is defined before comparing against it, and `run.loop.spec.ts`'s `resolvePoolConfig` only sets `concurrency` on the resolved config when the input provides one, avoiding an explicit `undefined` under `exactOptionalPropertyTypes`.

- 789da06: ### Fixed

  - `retry`'s `failed-requests-increment` and `total-retries-counted` stats specs assert the rejection with `assert.rejects` before reading stats, instead of parking every assertion inside an unchecked `.catch()` handler that silently skips if `execute()` resolves.
  - `logger`'s `global-floor-*` and `transport-floor-warn` specs assert the exact ordered list of surviving levels, not just a record count. `create-default`, `create-string-level`, and `create-numeric-level` attach a `MemoryTransport`-free observer and log boundary levels either side of the parsed floor to prove the default and parsed levels take effect.
  - `entity-store`'s `hooks-remove-many` spec asserts the exact `{event, id}` sequence removed, not just an event count.
  - `bounded-dispatcher`'s `dispatch-concurrency-bound` spec asserts the exact observed concurrency ceiling instead of an inclusive range that also accepts a stricter-than-configured mutex.
  - `context`'s `initialize-empty` scenario now initializes with a genuinely empty store, and the `initialize-scope` runner asserts the resulting key set against the fixture instead of hardcoding an unreachable branch.
  - `errors`' `timeout-no-dangling-timer` spec asserts the hook-timeout race's timer is cleared via a `clearTimeout` spy, instead of an observation window far shorter than the timer it claims is not left dangling.
  - `retry`'s hook-throw, hook-timeout, fsm, instantiation, backoff-strategy, and retry-support specs drop redundant fixture-literal-to-hardcoded-literal assertions that followed a real check, or replace them with an assertion against the actual thrown error's identity where one was in scope.

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

- d5be000: The package root is the sole code entrypoint for logger classes, transports, entities, constants, errors, and contracts.

  Serializable logger data is exposed through `LogRecordEntity.Type`, `LogBodyDataEntity.Type`, `LogFaultDataEntity.Type`, `LogLevelEntity.Type`, and `LogStatusEntity.Type`.

  Entity declarations import `JSONSchema` and `FromSchema` directly from `json-schema-to-ts`, and validator declarations import `ValidateFunction` directly from `ajv`.

  Logger, transport, and log-entry construction uses each class's direct `create()` entry point.

- d5be000: This release establishes one canonical public path across the fixed `@studnicky/*` package group. Consumers import package-owned behavior, errors, entities, and interfaces from the owning package root, construct stateful primitives through `Class.create(config)`, and invoke direct operation methods. Package code subpaths and parallel construction APIs are outside the public contract.

  Composition packages expose the ordering, failure, aggregation, or publication behavior they own. Dependency functionality stays with its declaring package and is imported directly from that package root. Collaborator accessors do not mirror scheduler, semaphore, cache, coalescer, fetch, retry, signal, timing, context, machine, or interpreter APIs. `BoundedDispatcher.getBus()` remains the functional access path for subscribing to and draining dispatcher-owned publications.

  Every JSON-Schema-expressible pure-data structure is a schema-derived type alias. Interfaces represent only runtime, callable, constructor, nominal, readonly-access, class-bearing, or other contracts that are not wholly schema-expressible. Pure data referenced by an interface is declared separately as a schema-derived named type. Declaration comments provide no exemptions, and `entitySuite` configures `@typescript-eslint/prefer-function-type` as `off` so callable interfaces receive one consistent verdict.

  Schema and validator declarations import dependency-owned symbols directly: `FromSchema` and `JSONSchema` from `json-schema-to-ts`, `ValidateFunction` from `ajv`, and `JSONSchema7Type` from `json-schema`. Each consuming package declares the dependency it uses; substrate packages do not proxy-export those declarations.

  `HookInvoker.invoke(hookName, fn)` enters synchronous hooks and returns `undefined`. `HookInvoker.invokeAsync(hookName, fn)` observes completion and returns `Promise<void>`. `onHookError(hookName, cause)` controls failure disposition without fabricating a recovery value, while hook timeout and reentrancy failures retain their package error identities.

  FSM and process orchestration use one optional `EffectHandlerInterface<TEffect, TEvent>` handler. `EffectInterpreter`, `InterpreterHistory`, and `ProcessKit` accept it through their direct `create(config)` paths. `InterpreterHistory` retains bounded, oldest-first variant-changing transition records and returns isolated readonly snapshots.

  `Signal.create()` supplies instance `compose(options)` and `timeout(ms)` lifecycle behavior; `Signal.never()` supplies the static never-aborting sentinel. `Delay.sleep(ms, { clock?, scheduler?, signal? })` and `Delay.value(...)` share the scheduler-aware cancellation path.

  `Throttle.create(config)` validates and copies caller configuration into instance-owned state. Adaptive concurrency changes only the instance's effective limit. `getStats()` returns `ThrottleStatsEntity.Type`, and `ThrottleStatsEntity.validate` is the root-exported compiled validator for trust-boundary checks.

- d51e400: ### Changed

  - `@studnicky/logger` exports `LoggerHookEventShapeEntity`. It replaces `LoggerHookEventKindEntity`; the entity's members and validator are unchanged.
  - `@studnicky/virtual-fs` `EntryEntity.Type` names its variant discriminant `shape`. It replaces `kind` and carries the same `'directory' | 'file'` values. `VirtualFileSystem.statSync()` results and every `EntryEntity` literal read or written by a consumer use the new field name.

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

- 837480d: The package root is the sole code entrypoint for logger classes, transports, entities, constants, errors, and contracts.

  Serializable logger data is exposed through `LogRecordEntity.Type`, `LogBodyDataEntity.Type`, `LogFaultDataEntity.Type`, `LogLevelEntity.Type`, and `LogStatusEntity.Type`.

  Entity declarations import `JSONSchema` and `FromSchema` directly from `json-schema-to-ts`, and validator declarations import `ValidateFunction` directly from `ajv`.

  Logger, transport, and log-entry construction uses each class's direct `create()` entry point.

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

- d2b44b7: `@studnicky/types` exports `PickDefined.from(record)`, which strips `undefined`-valued keys from a record while narrowing each remaining value's type away from `undefined` — built for builders assembling an options object from a mix of required and optional fields.

  `@studnicky/errors` exports `DomainErrorArgs.build(fields, options)`, which computes `code`, `message`, `retryable`, `cause`, `correlationId`, and `metadata` for a `super()` call while preserving the leaf error's `extends` chain and `instanceof` behavior.

  `@studnicky/logger` exports `ResolveMinLevel.from(options)` for the level validation and resolution shared by built-in and third-party `TransportInterface` implementations.

- d2b44b7: `@studnicky/errors` exports `HookInvoker`, a composable delegate for safely invoking synchronous or asynchronous consumer lifecycle hooks without forcing asynchronous behavior on a synchronous caller or producing an unhandled rejection. A class composes it as a field and calls `invoke(hookName, fn)` from its own methods. The package also exports `HookInvocationError`, `HookTimeoutError` for a configured timeout, and `ReentrantHookInvocationError` for synchronous same-call-stack reentrancy.

  `@studnicky/entity-store`, `@studnicky/file-lock`, `@studnicky/health-registry`, and `@studnicky/worker-pool` route lifecycle hooks through a record-and-continue `HookInvoker` boundary. Failures are available through `hookErrorCount` and `getHookErrors()` (`getHookErrorCount()` and `getHookErrors()` on `WorkerPool`).

  `@studnicky/logger`'s `Logger` composes a plain `HookInvoker` for `onLog`, `onDropped`, and `onChildCreate`, and separately guards `onTransportError`. Transport-hook failures are available through `hookErrorCount` and `getHookErrors()`.

  `@studnicky/retry` and `@studnicky/pipeline` expose a `hookTimeoutMs` builder option and matching `Retry.create` and `Pipeline.create` configuration field. A configured timeout routes an unsettled lifecycle hook to `onHookError` with a `HookTimeoutError` cause; an omitted timeout remains unbounded.

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2026-07-08

### Changed

- Exported log-level constants use `SCREAMING_SNAKE_CASE`: `LOG_LEVEL` and `LOG_LEVEL_MAP`.

### Changed

- `Logger`, `ConsoleTransport`, `MemoryTransport`, `FunctionTransport`, and `NoOpTransport` expose `Class.create(options)` and `Class.builder().build()` construction paths backed by protected constructors.
- `LogBody` and `LogFault` expose subclass-safe `static create()` construction.
- `BaseLogEntryBuilder` provides the protected constructor used by concrete subclasses.
- `LoggerBuilder`, `ConsoleTransportBuilder`, `MemoryTransportBuilder`, `FunctionTransportBuilder`, and `NoOpTransportBuilder` are exported from the package root and transport barrel where applicable.

## [1.0.0] - 2026-06-23

### Added

- `Logger` core with pluggable `TransportInterface` port; a Logger with no transports is a valid silent logger
- `ConsoleTransport` — writes to console using a level-dispatch map; the only file permitted to use `console`
- `NoOpTransport` — discards all records.
- `MemoryTransport` — captures `LogRecordEntity.Type` records into an internal buffer; exposes `records()` and `clear()` for test assertion.
- `FunctionTransport` — generic bridge adapter; passes each record to a user-supplied sink function, enabling integration with pino, winston, or any external logger
- Per-transport level filtering: each transport accepts an optional `level` option that acts as an independent floor above the Logger global floor
- `LogRecordEntity.Type` — schema-derived record assembled at emit time, carrying `level`, `time` (milliseconds), `metadata`, and `data`.
- `LoggerOptionsEntity` namespace — `Schema`, `Type`, and `validate` type guard for Logger configuration
- `./transports` package export entry for direct transport imports
- Fluent `LogBody` and `LogFault` builders enforce all required fields at build time.
- Child loggers via `.child(metadata)` for correlation ID injection from async context
