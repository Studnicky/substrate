# Changelog

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
  - @studnicky/json@10.0.0
  - @studnicky/types@10.0.0

## 9.2.0

### Minor Changes

- d2eef26: ### Changed

  - `folder-content-shape`'s entity `Schema` check accepts a schema-builder call (e.g. `Type.Object({...})`, `z.object({...})`) alongside the existing `as const` object-literal form, matching `type-alias-invariants`' library-agnostic `derivedFromSchema` recognition.
  - `folder-content-shape`'s `missingType`/`typeNotFromSchema` messages describe the deriving-type contract generically (`typeof Schema`) instead of naming `FromSchema` specifically.
  - `type-alias-invariants`' `derivedFromSchema` recognition drops its retained `json-schema-to-ts`-specific `FromSchema`/`JSONSchema` fast path — fully subsumed by the general structural recognition (a type alias with type parameters declared in a `.d.ts` file), so `FromSchema` is now judged by the same rule as every other deriving type.

  TypeBox and Zod entities (`*Entity.ts` under `entities/`) are now recognized end to end — the semantic classifier and the file-shape rule agree.

## 9.1.1

### Patch Changes

- @studnicky/types@9.1.1

## 9.1.0

### Minor Changes

- 84557ec: ### Added

  - `no-mixed-callable-shapes` forbids a type position that mixes a callable constituent with a data constituent. A declaration is callable or it is data, never both, and the diagnostic instructs a split rather than an interface conversion. Detection resolves named references, sees through arbitrary nesting, and treats `undefined`, `null`, and `never` as neutral so an optional callable stays a single shape. An interface counts as callable only when it owns or inherits a call or construct signature, so `Promise<T> | T` and other method-bearing library interfaces are data. The rule joins `entitySuite`.

  ### Changed

  - A generic type alias is a type-level function when its body reaches a conditional, mapped, or indexed-access type through a parenthesized wrapper, a union or intersection member, an array or tuple element, a type-reference argument, or a reference that forwards its own type parameters to another generic type-level function. Such a declaration is exempt from `aliasMustBeInterface`, which no interface declaration can satisfy. A reference supplying concrete type arguments composes a contract portion as before.
  - `type-alias-invariants` reports `aliasMustBeInterface` only where an interface can express the shape. A type alias whose body is directly a mixed callable and data union or intersection is reported by `no-mixed-callable-shapes` alone.
  - `interfaces-compose-named-types` defers to `no-mixed-callable-shapes` on a mixed member, so a mixed interface member yields one actionable diagnostic instead of two contradictory ones.
  - A member keyed by a unique symbol brands its declaration, alongside a member typed `unique symbol`. Both idioms mark a declaration nominally and neither is expressible in JSON, so a brand member is exempt from named-data composition. The exemption reaches brand markers only: every other member on the same declaration still resolves to a schema-derived type, and a computed key that is not a unique symbol composes as ordinary data.

- 789da06: ### Changed

  - `v8/inline-arrow-functions` and `v8/inline-functions` no longer exempt a dispatch-map property by its key name (`callback`, `execute`, `handler`, `message`, `process`, `transform`, `transformAsync`, `validate`). Whether an inline arrow or function value is flagged depends only on whether the enclosing object literal is rebuilt on every call — a module-scope `const` or `static` class field is still exempt, a map rebuilt inside a function body is still flagged, regardless of what its properties are named.
  - `descriptive-identifiers` no longer whitelists acronyms or loop-iterator names. Whether an identifier is flagged depends only on whether one of its camelCase tokens matches a banned shortening; single-letter loop iterators and short acronyms already fall outside that check structurally, since they never match a banned-shortening token.
  - `folder-content-shape` no longer exempts a file from the constants-placement or inline-regex checks by path (`constants/`, `fixtures/`, `tests/`, the `eslint-config` package, `eslint.config.mjs`, `entities/`, or an `index.ts` basename) or by declared name (`ajv`, `compiledValidator`, `Schema`, `validate`). A file is exempt only when it is structurally one of: a pure constants module (every top-level declaration is an import, a type declaration, or a data `const`), a module exporting an `*Entity`-named namespace, or a pure re-export barrel. Renaming a directory, moving a file into `constants/`, or naming a declaration `Schema`/`validate`/`ajv` no longer buys an escape on its own.

  ### Fixed

  - Thirteen domain error classes (`VisibleRangeError`, `VirtualFileSystemError`, `SampleBufferError`, `CircularBufferError`, `BatchError`, `QueueSizeExceededError`, `FileLockTimeoutError`, `ConnectTimeoutError`, `TimeoutError`, `BodyTimeoutError`, `HeadersTimeoutError`, `SocketError`, `CoalesceTimeoutError`) hoist their `DomainErrorArgs.build()` message builder to a `private static` class method instead of an inline arrow rebuilt on every construction call.

### Patch Changes

- 789da06: ### Changed

  - `no-mixed-callable-shapes` gains a fixture set covering every documented union/intersection mix (callable, constructor, named callable reference, callable interface reference, and a mixed member nested inside a property), the purely-callable and purely-data non-mixes, and the `Promise<T> | T` and `Map<K, V> | V` method-bearing library interface carve-outs.
  - `interface-must-be-contract` gains `invalid` fixtures for index-only data, generic pure data, and a named pure-data reference with no contract signal.
  - `interfaces-compose-named-types` gains `invalid` fixtures for an inline pure-data return value, an inline pure-data index value, and the brand-member exemption's narrowness — a computed unique-symbol key and a `unique symbol` value type each exempt only the brand member itself, while an ordinary sibling member still requires named-data composition. A locked-in regression test confirms a member mixing a callable constituent with data yields the `no-mixed-callable-shapes` diagnostic alone.

- 789da06: ### Changed

  - `@studnicky/errors`' `constants/index.ts` declares `ErrorCode`, `HttpStatus`, and `ErrorDefaults` directly and holds nothing else, making it a pure constants module. `CAUSE_CHAIN_DEPTH_LIMIT`/`CAUSE_DEPTH_SENTINEL` and the classifier HTTP-range constants re-export from `constants/CauseChainConstants.js` and `constants/ClassifierConstants.js` directly through the package's `src/index.ts` instead of routing through `constants/index.ts`. The package's exported symbols are unchanged.
  - The `DomainErrorArgs.build()` example names its message builder as a static method, so the message function is allocated once rather than per construction.
  - `folder-content-shape`'s constants-placement diagnostic no longer claims a flagged file "lives outside a 'constants/' folder" — a claim that no longer holds now the check is structural rather than path-based, and one a file already inside a `constants/` folder could trip. The message (renamed from `mustLiveInConstantsFolder` to `constantsNotIsolated`) instead states the actual structural condition: the file mixes top-level constants with other declarations (re-exports, functions, classes, or mutable bindings), so it isn't a self-contained constants module, and recommends extracting the constants into their own isolated file.

- 789da06: ### Fixed

  - `static-method-verbs` documentation describes the rule as it exists: a single `mode` option (`any` | `structural` | `typed`) gating detection, instead of the removed verb-prefix list and `additionalPrefixes`/`ignorePrefixes` options that no longer validate against the rule's schema.
  - `hash-private-fields` documentation states that the rule has no comment-based or path-based exemption — an `external-contract` directive comment and an adapters/domain-layer file path do not exempt an underscore-prefixed field.
  - `clean-diagnostics` documentation describes the auto-fix for a suppression comment that trails code on the same line, distinct from the whole-line removal for a comment-only line.
  - `inline-arrow-functions` documentation lists all eight exempt dispatch-map property keys, including `message`.
  - Fixtures for `inline-trivial-logic` (`allowLiterals`, `allowMemberExpressions`), `prefer-collection-types` (`checkArrayLiterals`, `checkFromEntries`, `checkModuleScopeArrays`), `require-options-object` (`minOptionals`), `inline-arrow-functions`, and `inline-functions` now exercise every documented option at a non-default value.
  - `LayerResolver` and `TypeContractClassification` scenario fixtures no longer carry inert top-level keys that duplicated the nested `input`/`expected` fields the test runners actually read.

- 789da06: ### Changed

  - `Mutex` documents its FIFO acquisition contract: waiters queued behind a held lock are granted access in request order, and a burst of queued waiters that time out together reject in that same order. Documented on the class TSDoc and in the README's new "Ordering" section, and referenced from the `burst-timeout-drains-queue` scenario so the exact-order assertion reads as contract verification.
  - `entitySuite`'s hand-written duplicate test (`entitySuite.test.ts`) is removed in favor of its data-driven equivalent (`entitySuite.loop.spec.ts` / `entitySuite.scenarios.json`), which gains the three `assigns-owning-rule` fixtures (naked type-alias-to-interface, suffix-collision pure data, dual-remediation contract) it was missing.

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

  - `backoff-strategies.scenarios.json` drops the top-level `attempt`/`baseDelay` fields duplicated across 44 cases — `backoff-strategies.loop.spec.ts` reads `scenarioCase.input.attempt`/`.baseDelay` exclusively, so the top-level copies were inert.
  - `adaptive-config.scenarios.json` drops the top-level `value` field duplicated on the two `reject-non-positive-target-latency-*` cases — `adaptive-config.loop.spec.ts` never reads `scenarioCase.value`.
  - `LayerResolver.scenarios.json` drops the `input.operation` and `input.expect` fields duplicated/orphaned across all 14 cases. `LayerResolver.loop.spec.ts` dispatches on the top-level `operation` discriminator (`operations[scenario.operation]`), so the top-level field is the live one here — the inverse of the other two files — and `input.expect` is read nowhere at all.

- 789da06: ### Fixed

  - Every `*.scenarios.json` import across the test suites carries the `with { type: 'json' }` import attribute `module: NodeNext` requires, clearing 221 `TS1543` diagnostics that `tsc -b` never surfaced because test files aren't part of any package's typechecked build — only `tsconfig.eslint.json` (used for ESLint's type-aware rules) sees them, and it consumes type information without reporting `TS` diagnostics on its own.
  - Tests that constructed a `protected`-constructor class directly with `new` now call the class's `this`-polymorphic static factory instead (`Subclass.create(...)`), clearing 78 `TS2674` diagnostics across `Clock`, `Channel`, `Coalesce`, `EntityStore`, `CircuitBreaker`, `EventBus`, `Mutex`, and `RealTimeScheduler` subclasses. The remaining 86 `TS2674` instances are left on `new` because no fitting factory exists for that call site: `StateMachine` is abstract with no static factory at all; `EffectInterpreter`, `InterpreterHistory`, `DeadLetterQueue`, `Signal`, `FetchClient`, and `ErrorClassifier`'s factories (where one exists) hardcode their own class rather than accepting `this`, so calling them on a subclass returns the base type instead of the subclass; and `Channel`/`Coalesce` subclasses that are themselves generic and expose subclass-only members lose that member's type through the factory's necessarily looser `TInstance` bound, so the direct constructor call is correct as written.

- 789da06: ### Fixed

  - Type-contract classification treats an indexed type as its element type alone. A resolved array's own members are prototype methods supplied by the standard library — `push`, `map`, `filter` and friends each own a call signature — so enumerating them classified every array as callable. The effect was position-dependent and therefore easy to miss: an array nested in an object property passed, while the same array at a type alias's root was always rejected as "not pure data".

- Updated dependencies [789da06]
- Updated dependencies [789da06]
  - @studnicky/types@9.1.0

## 9.0.0

### Major Changes

- d5be000: ### Changed

  - The package root is the sole code entrypoint. It exports `plugin`, `v8Plugin`, and the suite presets; individual rule objects are consumed through `plugin.rules` or `v8Plugin.rules` rather than named exports.

- d5be000: This release establishes one canonical public path across the fixed `@studnicky/*` package group. Consumers import package-owned behavior, errors, entities, and interfaces from the owning package root, construct stateful primitives through `Class.create(config)`, and invoke direct operation methods. Package code subpaths and parallel construction APIs are outside the public contract.

  Composition packages expose the ordering, failure, aggregation, or publication behavior they own. Dependency functionality stays with its declaring package and is imported directly from that package root. Collaborator accessors do not mirror scheduler, semaphore, cache, coalescer, fetch, retry, signal, timing, context, machine, or interpreter APIs. `BoundedDispatcher.getBus()` remains the functional access path for subscribing to and draining dispatcher-owned publications.

  Every JSON-Schema-expressible pure-data structure is a schema-derived type alias. Interfaces represent only runtime, callable, constructor, nominal, readonly-access, class-bearing, or other contracts that are not wholly schema-expressible. Pure data referenced by an interface is declared separately as a schema-derived named type. Declaration comments provide no exemptions, and `entitySuite` configures `@typescript-eslint/prefer-function-type` as `off` so callable interfaces receive one consistent verdict.

  Schema and validator declarations import dependency-owned symbols directly: `FromSchema` and `JSONSchema` from `json-schema-to-ts`, `ValidateFunction` from `ajv`, and `JSONSchema7Type` from `json-schema`. Each consuming package declares the dependency it uses; substrate packages do not proxy-export those declarations.

  `HookInvoker.invoke(hookName, fn)` enters synchronous hooks and returns `undefined`. `HookInvoker.invokeAsync(hookName, fn)` observes completion and returns `Promise<void>`. `onHookError(hookName, cause)` controls failure disposition without fabricating a recovery value, while hook timeout and reentrancy failures retain their package error identities.

  FSM and process orchestration use one optional `EffectHandlerInterface<TEffect, TEvent>` handler. `EffectInterpreter`, `InterpreterHistory`, and `ProcessKit` accept it through their direct `create(config)` paths. `InterpreterHistory` retains bounded, oldest-first variant-changing transition records and returns isolated readonly snapshots.

  `Signal.create()` supplies instance `compose(options)` and `timeout(ms)` lifecycle behavior; `Signal.never()` supplies the static never-aborting sentinel. `Delay.sleep(ms, { clock?, scheduler?, signal? })` and `Delay.value(...)` share the scheduler-aware cancellation path.

  `Throttle.create(config)` validates and copies caller configuration into instance-owned state. Adaptive concurrency changes only the instance's effective limit. `getStats()` returns `ThrottleStatsEntity.Type`, and `ThrottleStatsEntity.validate` is the root-exported compiled validator for trust-boundary checks.

- d51e400: ### Changed

  - `type-alias-invariants` recognizes schema-derived data by structure rather than by package. The enforced invariant is value-first authoring, a type-level function applied to that value, and a JSON-plain resolved result. TypeBox's `Static`, Zod's `z.infer`, `json-schema-to-ts`'s `FromSchema`, and a project-local equivalent all satisfy `derivedFromSchema` identically.
  - A deriving type qualifies when it is a type alias declared with type parameters, is declared in a `.d.ts` file, carries a `/** @schemaDerivation */` JSDoc tag, or shares a package root with the builder that produced the schema value. The JSDoc tag is the one in-code extension point, for a project-local schema-to-type function whose declaration is not itself a generic type alias.
  - A schema value is value-first authored when it is a module-scope `const` with no explicit type annotation whose initializer is a const-asserted object literal or a builder call. An explicit annotation or a `let` binding never qualifies, on every recognition path.
  - Recognition validates the type a derivation resolves to instead of recursing into the deriving type's implementation. A resolved type carrying call or construct signatures, class instances, symbols, bigints, `never`, `void`, `undefined`, `any`, or `unknown` is not canonical data.
  - A type alias with type parameters whose body is a conditional, mapped, or indexed-access type is a type-level function. It is retained as a type alias and is exempt from `aliasMustBeInterface` and `derivedFromSchema`, which no interface declaration can satisfy. Naming, aliasing, and readonly-output checks continue to apply. A reference to a type-level function composes the same contract portion an inline conditional, mapped, or indexed-access body composes; only the declaration is exempt.
  - `folder-content-shape` accepts an entity `Type` member that applies any schema-deriving type to `typeof Schema`.
  - `type-alias-invariants` and `interface-must-be-contract` take no options. `meta.schema` is `[]` on both, and ESLint's configured severity is the sole severity.

### Patch Changes

- beea6a5: `descriptive-identifiers`'s camelCase tokenizer no longer uses a backtracking regex (`/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|$)/g`), fixing a polynomial-time ReDoS (CodeQL `js/polynomial-redos`, high severity) on an uppercase run immediately followed by a non-letter character that isn't the end of the identifier — e.g. a long run of capitals before a digit forced the engine to backtrack one character at a time at every starting position within the run. Replaced with a linear-time manual scan that produces identical tokens for real-world identifiers and, as a side effect, fixes a latent bug where the old regex silently dropped acronym tokens entirely in that same shape (e.g. `HTTP2Client` tokenized as `["Client"]`, losing `HTTP2`).
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

  - The package root is the sole code entrypoint. It exports `plugin`, `v8Plugin`, and the suite presets; individual rule objects are consumed through `plugin.rules` or `v8Plugin.rules` rather than named exports.

- 837480d: This release establishes one canonical public path across the fixed `@studnicky/*` package group. Consumers import package-owned behavior, errors, entities, and interfaces from the owning package root, construct stateful primitives through `Class.create(config)`, and invoke direct operation methods. Package code subpaths and parallel construction APIs are outside the public contract.

  Composition packages expose the ordering, failure, aggregation, or publication behavior they own. Dependency functionality stays with its declaring package and is imported directly from that package root. Collaborator accessors do not mirror scheduler, semaphore, cache, coalescer, fetch, retry, signal, timing, context, machine, or interpreter APIs. `BoundedDispatcher.getBus()` remains the functional access path for subscribing to and draining dispatcher-owned publications.

  Every JSON-Schema-expressible pure-data structure is a schema-derived type alias. Interfaces represent only runtime, callable, constructor, nominal, readonly-access, class-bearing, or other contracts that are not wholly schema-expressible. Pure data referenced by an interface is declared separately as a schema-derived named type. Declaration comments provide no exemptions, and `entitySuite` configures `@typescript-eslint/prefer-function-type` as `off` so callable interfaces receive one consistent verdict.

  Schema and validator declarations import dependency-owned symbols directly: `FromSchema` and `JSONSchema` from `json-schema-to-ts`, `ValidateFunction` from `ajv`, and `JSONSchema7Type` from `json-schema`. Each consuming package declares the dependency it uses; substrate packages do not proxy-export those declarations.

  `HookInvoker.invoke(hookName, fn)` enters synchronous hooks and returns `undefined`. `HookInvoker.invokeAsync(hookName, fn)` observes completion and returns `Promise<void>`. `onHookError(hookName, cause)` controls failure disposition without fabricating a recovery value, while hook timeout and reentrancy failures retain their package error identities.

  FSM and process orchestration use one optional `EffectHandlerInterface<TEffect, TEvent>` handler. `EffectInterpreter`, `InterpreterHistory`, and `ProcessKit` accept it through their direct `create(config)` paths. `InterpreterHistory` retains bounded, oldest-first variant-changing transition records and returns isolated readonly snapshots.

  `Signal.create()` supplies instance `compose(options)` and `timeout(ms)` lifecycle behavior; `Signal.never()` supplies the static never-aborting sentinel. `Delay.sleep(ms, { clock?, scheduler?, signal? })` and `Delay.value(...)` share the scheduler-aware cancellation path.

  `Throttle.create(config)` validates and copies caller configuration into instance-owned state. Adaptive concurrency changes only the instance's effective limit. `getStats()` returns `ThrottleStatsEntity.Type`, and `ThrottleStatsEntity.validate` is the root-exported compiled validator for trust-boundary checks.

### Patch Changes

- 837480d: `descriptive-identifiers`'s camelCase tokenizer no longer uses a backtracking regex (`/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|$)/g`), fixing a polynomial-time ReDoS (CodeQL `js/polynomial-redos`, high severity) on an uppercase run immediately followed by a non-letter character that isn't the end of the identifier — e.g. a long run of capitals before a digit forced the engine to backtrack one character at a time at every starting position within the run. Replaced with a linear-time manual scan that produces identical tokens for real-world identifiers and, as a side effect, fixes a latent bug where the old regex silently dropped acronym tokens entirely in that same shape (e.g. `HTTP2Client` tokenized as `["Client"]`, losing `HTTP2`).
- Updated dependencies [837480d]
- Updated dependencies [837480d]
  - @studnicky/types@8.0.0

## 7.0.1

### Patch Changes

- 9e17c78: `descriptive-identifiers`'s camelCase tokenizer no longer uses a backtracking regex (`/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|$)/g`), fixing a polynomial-time ReDoS (CodeQL `js/polynomial-redos`, high severity) on an uppercase run immediately followed by a non-letter character that isn't the end of the identifier — e.g. a long run of capitals before a digit forced the engine to backtrack one character at a time at every starting position within the run. Replaced with a linear-time manual scan that produces identical tokens for real-world identifiers and, as a side effect, fixes a latent bug where the old regex silently dropped acronym tokens entirely in that same shape (e.g. `HTTP2Client` tokenized as `["Client"]`, losing `HTTP2`).
  - @studnicky/types@7.0.1

## 7.0.0

### Minor Changes

- d2b44b7: `@studnicky/v8` gains three loop-performance rules covering all loop types (`for`, `while`, `do...while`, `for...of`, `for...in`): `array-splice-outside-loops` flags `.splice()` calls inside a loop body, and `chained-array-iteration` flags `.map().filter()`/`.filter().map()` chains anywhere in the file.

  `array-scan-outside-loops` flags `.find()`/`.filter()`/`.indexOf()`/`.includes()`/`.some()`/`.every()` calls inside a loop body, type-checked against the receiver to distinguish a real array scan from `String.prototype.indexOf`/`.includes()` (same method names, different complexity story), and scoped-checked to skip a receiver proven to be freshly derived every iteration (a `for...of` loop's own binding, or a `const` declared inside the loop body) rather than the same stable collection re-scanned each time.

### Patch Changes

- d2b44b7: Fixed three pre-existing precision bugs surfaced by dogfooding the full rule set against real code for the first time:

  - `PropertyKeyName.get` only resolved unquoted (`key:`) property keys, never quoted (`'key':`) ones — since this repo's own `quote-props: always` convention quotes every property key, the `inlineFunctions`/`inlineArrowFunctions` rules' `EXEMPT_KEYS` allowlist never actually matched anything. Now resolves both forms.
  - `inlineArrowFunctions`'s `EXEMPT_KEYS` gains `'message'`, alongside the existing `'callback'`/`'handler'`/etc. — a single caller-supplied callback property in an options object is not a dispatch-map branch.
  - `folderContentShape`'s `isUnderFolder` matched a `types`/`interfaces` path segment anywhere in the file path, including a package's own root name (e.g. `packages/types/`) — incorrectly treating any package literally named `types` or `interfaces` as if every file inside it lived under a `types/`/`interfaces/` convention subfolder. Now only matches real subfolders within the package.

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. Fluent builders assemble their options object via `@studnicky/types`'s `PickDefined.from()` instead of manual spread-ternary chains. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- 081c7bd: Pin `vite` to `^6.4.3` and `esbuild` to `^0.25.0` via a root `pnpm.overrides` entry, resolving four Dependabot alerts in the transitive `vitepress` docs-build toolchain: `vite`'s `server.fs.deny` bypass on Windows alternate paths, a path-traversal issue in optimized-deps `.map` handling, a `launch-editor` NTLMv2 hash disclosure via UNC paths, and an `esbuild` dev-server request/response exposure. Dev-only tooling change; no published package's runtime code is affected.
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.0.0] - 2026-07-16

### Added

- New `folder-content-shape` rule enforces that `interfaces/` folders hold `interface` declarations, `types/` folders hold `type` alias declarations, and other folders keep data constants (regex, enums, frozen collections) grouped under a `constants/` folder (or `fixtures/` for test/example data). Regex literals are zero-tolerance — a single inline regex is flagged, unlike the 2+ threshold for other constants. Merges the former `folder-declaration-shape`, `constants-folder-required`, and `entity-namespace` rules.
- New `type-alias-invariants` rule merges the former `type-alias-must-end-type`, `no-readonly-in-data-type`, `no-type-aliasing`, `types-derived-from-schema`, and `no-prefer-existing-type` rules into one shared visitor with five independently toggleable checks. Types imported from external (`node_modules`) packages are automatically exempt from schema-derivation via real type-checker resolution.
- New hexagonal-architecture rule category: `layer-import-boundary`, `domain-purity`, `adapter-only-import`, and `known-types-outside-adapters` (bans `any`/`unknown` outside a configurable adapters layer). `HexagonalSuite.create(...)` wires all four from one shared layers/sourceRoot configuration.
- New `whole-canonical-types` rule bans deriving `Partial<X>`/`Pick<X, K>`/`Omit<X, K>` from any canonical, codebase-owned named type or interface — no directive-comment exemption.
- New domain-grouped suite/preset configs — `entitySuite`, `hygieneSuite`, `v8Suite`, and `HexagonalSuite.create(...)` — for one-import consumption.

### Changed

- **Breaking:** every rule id previously framed as a prohibition (`no-*`) is renamed to a positive framing: `no-any-unknown-outside-adapters`→`known-types-outside-adapters`, `no-bind-apply-call`→`direct-invocation-only`, `no-concat-in-loops`→`array-concat-outside-loops` (`@studnicky/v8`), `no-export-alias`→`canonical-export-names`, `no-freestanding-verb-noun`→`static-method-verbs`, `no-partial-canonical-type`→`whole-canonical-types`, `no-project-internal-acronyms`→`descriptive-identifiers`, `no-spread-in-loops`→`array-spread-outside-loops` (`@studnicky/v8`), `no-suppression-comments`→`clean-diagnostics`, `no-this-alias`→`lexical-this-only`, `no-trivial-shim`→`inline-trivial-logic`, `no-underscore-private`→`hash-private-fields`. Rule behavior and `messageId`s are unchanged — only the rule id, exported symbol, and filename changed.
- **Breaking:** the package now depends on `@studnicky/types` (`workspace:*`) as a real runtime dependency, ending its previous zero-runtime-dependency design — required so `type-alias-invariants` can derive its own options type via `FromSchema` instead of hand-declaring a parallel type.
- `static-method-verbs` (formerly `no-freestanding-verb-noun`) no longer detects violations via a hardcoded verb-prefix name list; it uses real structural (and optionally type-aware) AST analysis via a configurable `mode` option. `single-export`'s error-class detection resolves the superclass through the TypeScript type checker instead of a `"Error"`-suffix name check.

## [5.0.0] - 2026-07-08

### Changed

- **Breaking:** `@studnicky/no-export-alias` now forbids every non-index re-export path. Outside `index.*` files, the rule rejects `export { Foo } from './foo.js'`, `export * from './foo.js'`, and forwarding an imported binding such as `import { Foo } from './foo.js'; export { Foo };`. The same restriction now applies to type-only imports and exports.
- **Breaking:** `@studnicky/single-export` now recognizes restricted topology both as directories (`constants/`, `entities/`, `errors/`, `interfaces/`, `types/`) and as fractal filename suffixes such as `client.constants.ts` and `request.types.ts`. Constant modules within that topology must export `SCREAMING_SNAKE_CASE` symbols only, and enum exemptions now apply only to files whose exports are limited to enums and const values.
- `@studnicky/no-suppression-comments` now rejects coverage suppression markers including `c8 ignore`, `c8-ignore`, and `istanbul ignore entirely`, in addition to the existing lint and TypeScript suppression comments.

## [2.0.0] - 2026-06-25

### Removed (Breaking)

- `createEslintConfig` factory function removed. The package is consumed as a standard ESLint plugin: register `plugin` and `v8Plugin` in your flat config directly.
- `EslintConfigOptionsType` type removed.
- `@studnicky/config` runtime dependency dropped; the package now has no runtime dependencies.

## [1.0.0] - 2026-06-22

### Added

- ESLint 9 flat config factory (`createEslintConfig`) with optional `tsconfigRootDir` configuration, targeting TypeScript source files with typescript-eslint projectService integration.
- Custom ESLint plugin with four rules: `no-bind-apply-call`, `no-suppression-comments`, `no-trivial-shim`, and `single-export`.
- V8-optimization rules config array available via the `@studnicky/eslint-config/v8` export.
- Integrated rule sets from typescript-eslint, @stylistic/eslint-plugin, eslint-plugin-perfectionist, eslint-plugin-import-x, eslint-plugin-regexp, and eslint-plugin-unused-imports.
