# Changelog

## 12.0.0

### Major Changes

- 46e9a40: Serialize every error as an RFC 9457 Problem Details object, and extract `filters` into its own package.
  
  **Breaking — `@studnicky/errors`**
  
  `toJSON()` now returns an RFC 9457 Problem Details object, and it is the only serialized form.
  
  - `message` → `detail` (RFC 9457 §3.1.4: the occurrence-specific explanation)
  - `name` → `title` (§3.1.2: names the problem TYPE and does not vary per occurrence)
  - `cause` (nested object) → `causes` (flat array, nearest first, bounded and cycle-safe)
  - `ModuleError` option `statusCode` → `status`, the RFC's own member; `ModuleError.statusCode` is gone, use the inherited `status`
  - `ErrorDefaults.*.statusCode` → `ErrorDefaults.*.status`
  - `BaseError.toSerializedError()` removed — `toJSON()` is the single serialized form
  - `ValidationProblemDetailsEntity` removed; `ValidationErrors.report()` returns `ProblemDetailsEntity.Type`
  - `ThrownValueEntity`/`CauseNodeEntity` carry `type`/`title`/`detail` instead of `kind`/`message`; the problem type URI is the discriminant, so no separate classification member exists
  
  New `type` (from the error's `code`), `status`, and `instance` members, plus `code`, `correlationId`, `timestamp`, `retryable`, `context`, `stack` and `causes` as RFC §3.2 extension members. `ProblemDetailsEntity` makes every member optional per §3.1 and keeps the object open per §3.2, so extension members survive intake.
  
  Subclass extras merged by `serializeExtra()` can no longer displace a registered member, and absent members are omitted rather than emitted as `undefined`.
  
  **Breaking — `@studnicky/eslint-config`**
  
  Layer bindings rename their discriminant: `kind` → `unit`. Every `bindings` entry in an `eslint.config.mjs` must be updated.
  
  **Added**
  
  - `@studnicky/eslint-config`: `no-threaded-vocabulary` bans closed-vocabulary tokens (booleans, enums, literal unions) in parameter, field and property positions outside a declared resolution site; `no-function-registries` bans object literals aggregating multiple function implementations.
  - `@studnicky/filters`: extracted from `@studnicky/types`.
  - `@studnicky/matching`, `@studnicky/matching-filters`, `@studnicky/semantic-matching`, `@studnicky/topic-router`, `@studnicky/topic-router-models`, `@studnicky/drilldown`.
  - `@studnicky/types`: `Predicates`, replacing per-package structural guards.
  
  **Fixed**
  
  - `@studnicky/fetch`: `HTTPError` no longer shadows the inherited `status`, and reports the fetched URL as RFC `instance`.
  - `eslint.config.mjs`: six packages had no layer binding, silently disabling all four architecture rules for 214 files.

### Patch Changes

- @studnicky/intake-kit@12.0.0
  - @studnicky/types@12.0.0

## 11.1.0

### Patch Changes

- Updated dependencies [44865fd]
  - @studnicky/types@11.1.0
  - @studnicky/intake-kit@11.1.0

## 11.0.1

### Patch Changes

- @studnicky/intake-kit@11.0.1
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
- Updated dependencies [e703bcd]
  - @studnicky/intake-kit@11.0.0
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

- @studnicky/types@10.0.0

## 9.2.0

### Patch Changes

- Version bump only — no functional changes. Released in lockstep with the fixed-package group.

## 9.1.1

### Patch Changes

- @studnicky/types@9.1.1

## 9.1.0

### Minor Changes

- 789da06: ### Added

  - `@studnicky/json`'s `Patch.create()` returns the subclass instance type when called on a subclass, instead of the base `Patch` type.
  - `@studnicky/errors`' `ValidationErrors.create()` and `DefaultHttpErrorClassifier.create()` return the subclass instance type when called on a subclass, instead of the base type.
  - Each of these factories now validates at runtime (via `Reflect.construct` plus an `instanceof` check) that the constructor invoked as `this` actually produced the requested subclass, throwing a `TypeError` naming the factory if it did not.

### Patch Changes

- 789da06: ### Changed

  - `@studnicky/errors`' `constants/index.ts` declares `ErrorCode`, `HttpStatus`, and `ErrorDefaults` directly and holds nothing else, making it a pure constants module. `CAUSE_CHAIN_DEPTH_LIMIT`/`CAUSE_DEPTH_SENTINEL` and the classifier HTTP-range constants re-export from `constants/CauseChainConstants.js` and `constants/ClassifierConstants.js` directly through the package's `src/index.ts` instead of routing through `constants/index.ts`. The package's exported symbols are unchanged.
  - The `DomainErrorArgs.build()` example names its message builder as a static method, so the message function is allocated once rather than per construction.
  - `folder-content-shape`'s constants-placement diagnostic no longer claims a flagged file "lives outside a 'constants/' folder" — a claim that no longer holds now the check is structural rather than path-based, and one a file already inside a `constants/` folder could trip. The message (renamed from `mustLiveInConstantsFolder` to `constantsNotIsolated`) instead states the actual structural condition: the file mixes top-level constants with other declarations (re-exports, functions, classes, or mutable bindings), so it isn't a self-contained constants module, and recommends extracting the constants into their own isolated file.

- 789da06: ### Changed

  - `module-error.loop.spec.ts`'s `scenario-defaults` case asserts `ModuleError.create`'s scenario defaults against independent literal expectations in `module-error.scenarios.json` instead of re-deriving them from `ErrorDefaults` — the same table the code under test indexes into. The `scenario-authentication-defaults` and `scenario-not-found-defaults` fixtures now carry their real expected values (`AUTHENTICATION_ERROR`/401/non-retryable and `NOT_FOUND`/404/non-retryable) instead of a copy-pasted `CONNECTION_ERROR`/503/retryable triple.
  - `matchers.loop.spec.ts`'s `negative-matcher-route` case reads its boolean expectations from `matchers.scenarios.json` instead of hardcoding every literal, matching the pattern used by its sibling cases. The fixture's `lessThan`, `lte`, and `not` fields are corrected to `true` to match the matchers' actual output for the case's input.
  - `CliExitError`'s `defaults-exit-code` case genuinely omits the constructor argument (via an `{"__shape": "undefined"}` input tag) and asserts the resulting `exitCode` is `1`, instead of passing `1` explicitly and testing nothing about the default.
  - Removes assertions across `cli-exit-error.loop.spec.ts`, `domain-error-args.loop.spec.ts`, and `examples.loop.spec.ts` that compared two fixture-only values to each other (or a fixture value to a hardcoded literal) without touching the code under test.

- 789da06: ### Changed

  - `packages/errors`'s `.loop.spec.ts` test files now typecheck. Most of the type errors traced back to one recurring bug: a scenario-case union declared several shape literals on a single object member (e.g. `shape: 'a' | 'b' | 'c'`) instead of one member per literal. `Extract<ScenarioCase, { shape: K }>` can't distribute over a union that isn't actually split per-literal, so it silently resolved to `never` for every runner, and every `scenario.expected`/`scenario.input` access inside those runners failed with "Property does not exist on type 'never'". Fixed per file according to what the case data actually needs:
    - `matchers.loop.spec.ts`, `error-classifier.loop.spec.ts`, and `constants.loop.spec.ts` split the packed shape groups into real discriminated union members (one literal per member) so `Extract` narrows correctly.
    - `validation-errors.loop.spec.ts` and `subclass-extension.loop.spec.ts` drop the `Extract`-based narrowing entirely — every case in each file already shares one structural shape, so per-literal narrowing added nothing.
    - `base-error.loop.spec.ts` merges its two scenario-case variants into one now that `expected: Record<string, unknown>` already accommodates every field either variant reads.
    - `module-error.loop.spec.ts` and `cli-exit-error.loop.spec.ts` were missing `name: string` on every scenario-case member despite reading `scenario.name` at the call site.
  - Also fixes, in the same files: `exactOptionalPropertyTypes` violations from spreading a possibly-`undefined`-valued optional property directly into an options object (now conditionally spread); a `ModuleError` test subclass whose static `create()` incompatibly overrode the base class's static `create()` (renamed to `build()`); a `NetworkError` test subclass that forwarded `ModuleErrorCreateOptionsInterface` (the narrower `.create()` options shape) to its constructor instead of `ModuleErrorOptionsInterface` (the shape the constructor actually accepts); and several indexing/property accesses through JSON-sourced `Record<string, unknown>`/`unknown` fixture data narrowed with a local cast where the field's concrete shape is known from the test's own construction of the value.
  - `matchers.ts`'s `instance.ofAny(...)` cannot accept more than one built-in `Error` subclass constructor (e.g. `ofAny(RangeError, TypeError)`) under the package's strict TypeScript config — `<T>(...constructors: (new (...args: unknown[]) => T)[])` rejects built-in constructors once two or more with different constructor parameter lists are unified into one `T`, even though `instance.of(TypeError)` (single-constructor) infers fine. Left as-is in `matchers.loop.spec.ts` (4 residual errors) since fixing it requires a source-level signature change, and the test intentionally exercises the multi-constructor call.

- 789da06: ### Fixed

  - `matchers.instance.of()` and `matchers.instance.ofAny()` accept built-in error constructors. Both declare their constructor parameter as `new (...args: never[]) => T`, so a constructor with its own parameter list — such as `TypeError`'s `(message?: string, options?: ErrorOptions)` — satisfies it. `ofAny(TypeError, RangeError, ReferenceError)`, the form shown in the method's own documentation, type-checks.

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
  - @studnicky/types@9.1.0

## 9.0.0

### Major Changes

- d5be000: ### Changed

  - Error code registration is package-internal and exposes no process-global mutation or collision-handler API.
  - `HookInvoker.invoke(hookName, fn)` enters hooks synchronously and always returns `undefined`, including for thenable callbacks. `invokeAsync(hookName, fn)` is the only completion-observed API and returns `Promise<void>`. Protected `onHookError(hookName, cause)` returns `void | Promise<void>` and controls failure disposition without fabricating recovery values; timeout, reentrancy, and hook-error semantics remain unchanged.
  - `ValidationErrors` instances are constructed through `ValidationErrors.create(items)`.
  - `ValidationErrors.create()`, `ValidationErrors.merge()`, and `ValidationErrors.fromValidatorErrors()` provide the collection construction paths.
  - Public JSON signatures import `JSONSchema7Type` and `JSONSchema7Object` from `json-schema`, backed by the package's direct `@types/json-schema` dependency.
  - `@studnicky/errors` is the sole public code entrypoint and exports `EventRecorder` with the package-owned error contracts.

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
  - @studnicky/types@9.0.0

## 8.0.1

### Patch Changes

- The test estate uses the controlled test-suite harness for coverage and JSON-backed loop fixtures with `input.batch` fan-out configuration across package scenario suites.
- Updated dependencies
  - @studnicky/types@8.0.1

## 8.0.0

### Major Changes

- 837480d: ### Changed

  - Error code registration is package-internal and exposes no process-global mutation or collision-handler API.
  - `HookInvoker.invoke(hookName, fn)` enters hooks synchronously and always returns `undefined`, including for thenable callbacks. `invokeAsync(hookName, fn)` is the only completion-observed API and returns `Promise<void>`. Protected `onHookError(hookName, cause)` returns `void | Promise<void>` and controls failure disposition without fabricating recovery values; timeout, reentrancy, and hook-error semantics remain unchanged.
  - `ValidationErrors` instances are constructed through `ValidationErrors.create(items)`.
  - `ValidationErrors.create()`, `ValidationErrors.merge()`, and `ValidationErrors.fromValidatorErrors()` provide the collection construction paths.
  - Public JSON signatures import `JSONSchema7Type` and `JSONSchema7Object` from `json-schema`, backed by the package's direct `@types/json-schema` dependency.
  - `@studnicky/errors` is the sole public code entrypoint and exports `EventRecorder` with the package-owned error contracts.

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
  - @studnicky/types@8.0.0

## 7.0.1

### Patch Changes

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
  - @studnicky/types@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `BaseError` abstract class with `code`, `timestamp`, `correlationId`, `retryable`, structured `toJSON()` and `toSerializedError()` serialization, and overridable `serializeExtra()` / `formatUserMessage()` hooks
- `ModuleError` with scenario-defaults API (`ErrorDefaults`), `context`, `statusCode`, and cause-chain traversal helpers (`getCauseChain`, `findCauseOfType`, `hasCauseOfType`)
- `ValidationError` for input validation failures with structured violation list; `CliExitError` for process exit codes
- `ErrorCode`, `ErrorDefaults`, and `HttpStatus` constant maps for standardized code and status assignment
