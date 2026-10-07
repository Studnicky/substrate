# @studnicky/entity

<<<<<<< HEAD
=======

## 15.1.0

### Patch Changes

- @studnicky/types@15.1.0

## 15.0.2

### Patch Changes

- Updated dependencies [2174773]
- Updated dependencies [ea9eefe]
  - @studnicky/types@15.0.2

## 15.0.1

### Patch Changes

- Updated dependencies [3965298]
  - @studnicky/types@15.0.1

> > > > > > > origin/develop

## 15.0.0

### Major Changes

- 91ca066: Every source file reachable from a package's `./browser` export imports its workspace dependencies through their own `/browser` entrypoint rather than `/node`, so a package's browser build no longer pulls in a dependency's Node-only implementation. A package whose `/node` and `/browser` builds previously diverged only by accident of which entrypoint a transitive import happened to resolve to now gets the browser-safe implementation consistently through its whole reachable graph.
- 0efeecf: `@studnicky/entity` validates JSON Schema 2020-12 through a specialised-closure engine on both the `./node` and `./browser` exports. Neither path constructs a function at runtime, so both work under a `script-src` Content-Security-Policy with no `unsafe-eval`. The `ajv`, `ajv-formats` and `@cfworker/json-schema` dependencies are removed.

  Both exports share one engine, so they report identical results and an identical diagnostic shape (`keyword`, `instancePath`, `message`, `params`, `schemaPath`) for every schema and instance. `EntityCompiler`'s public API — `compile`, `compileIntake`, `compileCreate`, `formatErrors` — is unchanged.

- a664914: Validation diagnostics render from one canonical message table, so the same schema and value produce byte-identical `message` text through `@studnicky/entity/node` and `@studnicky/entity/browser`. The text is substrate's own rather than the backing engine's: Ajv's wording for the keywords it covers, and the same wording on the browser path, which previously surfaced `@cfworker/json-schema`'s prose. Code asserting on `error.message` from the browser entrypoint sees different text than before.

  Three defects the browser path carried are fixed. A value outside the JSON Schema data model — `undefined`, a function, a bigint, a symbol — made `@cfworker/json-schema` throw instead of failing validation, so validating an `Error` carrying a `status` crashed the caller rather than classifying it. `NaN` and `Infinity` satisfied `type: 'number'`, which Ajv rejects. `additionalProperties` is evaluated with `for...in` on both engines and therefore walks the prototype chain, while the browser path collected own keys only, so a prototype-inherited property passed a guard the node path enforced.

  `not`, `unevaluatedProperties`, `unevaluatedItems`, `oneOf`, `dependentRequired` and the `contains` family now render canonically instead of falling through to the engine's own text. Ajv collapses `contains`, `minContains` and `maxContains` into one diagnostic and reports every declared `dependentRequired` entry rather than the missing ones; both are normalized to that shape on the browser path.

- 3998901: `EntityCreateFunctionInterface<TStatic, TInput = TStatic>` and `EntityCompiler.compileCreate<TStatic, TInput = TStatic>` now accept a separate input type. Previously both the parameter and return type were the single, branded `TEntity`, so `create({ someConstrainedField: 0 })` was unsatisfiable for any entity with a `minimum`/`maximum`/`minLength` constraint — a hand-written literal can never carry a brand keyed by a `unique symbol` that isn't exported from its declaring module. `TInput` defaults to `TStatic`, so every existing single-argument usage keeps compiling unchanged; an entity that wants a real fix pairs `Type` with its own `NodeInputType`-derived `InputType`, the same pairing `EntityIntakeFunctionInterface` and `LruCacheOptionsEntity` already established.

  `EntityIntakeFunctionInterface` and `EntityValidateFunctionInterface` were checked for the same defect and are unaffected — both already accept `unknown` on their input side.

- 91ca066: `$ref` resolution follows RFC 3986: a reference merges against the base URI in effect at the node that declares it, dot segments removed, and a nested `$id` shifts the base beneath it. A resource index walks the document once, recording every resource by base URI and every anchor against the base in scope, so a fragment resolves relative to its own resource root. `EntityCompiler.compile` and `compileIntake` take an optional map of externally identified schemas, resolved per call rather than through a mutable registry; the eight 2020-12 metaschema documents ship with the package, so `$schema` resolves without network access. A `$dynamicRef` whose target declares no matching anchor behaves as a plain reference, `$dynamicAnchor` frames resolve per resource rather than per node, the reference cycle guard tracks resolution path rather than value identity, and pointer resolution accepts array indices and composite segments.

  Both entrypoints accept a bare boolean schema — `true` accepts every instance, `false` rejects every instance — through `compile`, `compileIntake`, and `compileCreate`.

  A rejected constraint reports the constraint, the expected and actual values, and the JSON Pointer where it applies, rather than only the brand name. Missing required properties and excess properties under a closed object report the same way. A constraint keyword carries a compile-time brand on its derived type, so a value constrained one way is not assignable to a type constrained another — `format: 'email'` and `format: 'uri'` derive as different types rather than both as `string`. A `$ref` to another entity's `$id` derives its type through `EntityReferenceRegistryInterface`, an interface consumers augment by declaration merging; an unregistered identifier derives as `ReferenceNotFoundType` rather than `unknown`. Schema-level `Pick`, `Omit`, `Partial`, `Required`, and `Extend` produce a new schema and its derived type together. Named cross-field invariants carry a JSON Pointer location through `InvariantFunctionInterface`.

  `EntityCompilerInterface`, `SchemaCompilerInterface`, `SchemaRegistrySetInterface`, `SchemaNodeInterface`, and `ObjectSchemaShapeInterface` are exported from `@studnicky/entity/interfaces`.

  The `contains` recheck follows a resolved `$ref` on both entrypoints, guarded against a repeated reference; an array reached through a reference and declaring `contains`, `minContains`, or `maxContains` is checked against the specified defaults rather than the backing engine's own result. A keyword location that crosses a `$ref` resolves the keyword's declared value from the referenced schema instead of returning `undefined` and falling back to engine prose.

- 6c5051a: `EntityCompiler.compileIntake` and `EntityCompiler.compileCreate` accept the same optional `remoteSchemas` map as `EntityCompiler.compile`, keyed by the URI a `$ref` addresses them by and resolved as if externally retrieved with no network I/O. A schema whose `$ref` addresses another document compiles through `compileIntake` and `compileCreate` exactly as it already did through `compile`. `EntityCompilerInterface` declares `remoteSchemas` on all three entry points, matching their implementations.
- 966e1a8: BREAKING: `EntityValidationErrorInterface`'s `params` field is renamed to `parameters`. `params` was Ajv's wire-format field name, carried over into an interface this codebase owns and Ajv no longer backs — nothing in `packages/entity` reads Ajv's `ErrorObject` anymore. `ValidationErrorFactory.build` now returns the interface directly as an object literal instead of building a loosely-typed record and asserting it through `as unknown as EntityValidationErrorInterface`. Any consumer reading `.params` off a diagnostic from `EntityCompiler.compile`/`compileIntake`/`compileCreate`'s `errors` array, or off a caught `SchemaIntakeError`, must read `.parameters` instead.
- 4d24d54: Every error a package emits is a named `BaseError` subclass with a stable `code`. Native errors the packages constructed are replaced by named classes in each package's error family; platform and runtime failures (JSON parsing and serialization, `structuredClone`, URL and RegExp construction, `BigInt`, code-point and array-length conversions, `node:fs`, `worker_threads`, fetch and undici, IndexedDB, Web Storage, OPFS, and `node:assert`) are caught at the package boundary and rethrown as named classes with the original as `cause`. Abort reasons created by the packages are named `BaseError` instances. Errors thrown by caller-supplied callbacks, hooks, and reducers propagate unchanged through `CallerFault.propagate` and `CallerFault.rejection` from `@studnicky/types`. `SchemaIntakeError` extends `BaseError`. `@studnicky/eslint-config` ships the opt-in `@studnicky/no-native-error` rule that enforces this contract: native error construction and heritage, non-`BaseError` throws, rejections, and abort reasons, and known-throwing platform calls outside a `try`/`catch`.
- 1402570: `SchemaNode.defineObject`'s runtime `additionalProperties` value matches its declared type default: omitting `options.additionalProperties` writes `false` into the node's `schema`, the same value `TAdditional`'s type-level default claims. The change is confined to `Node.schema`, which `EntityCompiler.compile`/`compileIntake`/`compileCreate` never read — those compile the separately hand-authored `Schema`. No shipped validator changes behavior; no entity in the workspace reads a `Node.schema.additionalProperties` value at runtime.
- 8e6a261: New `SchemaNode.defineDecorated<TSchema, TTarget>(schema, target)` wraps an already-built node with sibling schema keys — such as a `default` — without restating the target's shape: the derived type reads `target`'s own precomputed `static`/`input` directly, the same indexed-access rule every other constructor follows, while `schema` carries only the decoration. This closes the third shape of the `Node`/`Schema` default-derivation gap: a `default` attached by wrapping a _referenced_ node (rather than composed inline at a `defineEnum`/`defineOneOf`/etc. call site) previously had no constructor call site to carry it, so `InferDefaultBearingKeysType` could not see it.

  `SchemaNode.defineReference` is now a thin specialisation of `defineDecorated` — `defineDecorated({ '$ref': pointer, 'title': title }, target)` — rather than a second, parallel implementation of the same "wrap, don't restate" judgement; its own behavior and public signature are unchanged.

  `TimingOptionsEntity.ts`'s `precision` field, previously `TimingPrecisionEntity.Node` used as-is with its `default` living only in the hand-authored `Schema`, is converted to `SchemaNode.defineDecorated({ 'default': DEFAULT_DECIMAL_PRECISION } as const, TimingPrecisionEntity.Node)`. Runtime behavior is unchanged — `Schema` already drove the compiler and already carried this default — but `TimingOptionsEntity.Type['precision']` is now correctly derived as present rather than optional, which also resolves five previously-spurious `possibly undefined` type errors in `Timing.ts`'s direct `timingOptions.precision.*` reads.

- 1eac93c: `SchemaNode.defineArray` and `SchemaNode.defineObject` build their schema literal through `PickDefined.from` instead of writing an `undefined`-valued `contains`/`patternProperties` key onto the object, so the runtime shape matches the type's optional-key semantics under `exactOptionalPropertyTypes` without a cast bridging through `unknown`.

  `Compose.pick`, `Compose.omit`, and `Compose.extend` narrow only the `properties`/`required` fields their own filter/merge logic actually computes, with a direct assertion to the exact `Pick`/`Omit`/`Extract`/`Exclude`-derived type — never the whole return object through `unknown`. `Compose.keepProperties`/`dropProperties`/`keepValues`/`dropValues` are generic over `ObjectSchemaShapeInterface`, not the caller's branded `TSchema`, so a scoped assertion on the two fields those helpers actually touch is the one place per method the branded generic type is restored.

  No `as unknown as` remains in either file.

  `Compose.ts` carries four single-hop `as` assertions across `pick`/`omit`/`extend` where a generic `keepProperties`/`dropProperties`/`keepValues`/`dropValues` could carry one instead: parameterizing each over the caller's `TProperties`/`TKeys` and asserting once inside, at the point `Object.fromEntries` genuinely returns `Record<string, unknown>`, would let all three call sites drop their own assertion entirely. A known shape, not fixed here.

- 2831589: `SchemaNode.defineConst`, `defineEnum`, `defineAllOf`, `defineAnyOf`, `defineOneOf`, and `defineNot` now accept an optional leading sibling schema literal, merged into the returned `schema` alongside the hard-coded keyword — `defineEnum({ 'default': 'structural' } as const, values)`. Previously these six constructors hard-coded their returned schema shape (`{ enum: TValues }`, `{ oneOf: TItems }`, …), so an enum, union, const, or negation property with a `default` could express it in `Schema` but never in `Node` — `InferDefaultBearingKeysType` read the property as absent-unless-defaulted on the static type while the runtime validator/`.create()` filled it, a silent disagreement between the derived type and the validator. The existing single-argument call shape keeps compiling unchanged via an overload; `defineTuple` already accepted a sibling schema literal and needed no change. `SchemaNode.defineReference` also gained an optional trailing `title` parameter, threaded into two converted entities (`JsonValueEntity`, `JsonObjectEntity`) whose `Schema` carried a `title` the `Node` was missing — cosmetic, since `title` feeds no type derivation.

### Minor Changes

- f820efa: `SchemaNode` gains `defineAnnotated`, layering sibling schema keys (e.g. `default`) onto a target node's own schema without discarding it. `defineDecorated` replaces the target's schema entirely — correct for `$ref`/`$defs` resolution, where inlining a recursive target would recurse forever — but that made it the wrong tool for attaching an annotation to a non-recursive node while keeping its full structural schema, which is what `defineAnnotated` is for.

### Patch Changes

- Updated dependencies [cf88dc6]
- Updated dependencies [ebd9f1c]
- Updated dependencies [bb7bb62]
- Updated dependencies [4d24d54]
- Updated dependencies
- Updated dependencies [3da660e]
- Updated dependencies [543de66]
  - @studnicky/types@15.0.0

## 14.0.0

### Patch Changes

- Updated dependencies [4d4555f]
  - @studnicky/types@14.0.0

## 13.0.0

### Major Changes

- 95c7c69: Schema intake preserves schema-defined additional-property rules and keeps caller input unchanged. `@studnicky/entity` replaces `@studnicky/intake-kit`; update runtime imports to `@studnicky/entity/node` or `@studnicky/entity/browser`, and rename `IntakeCompiler` to `EntityCompiler`. The entity package provides strict create and intake compilation that rejects undeclared properties at both entry points.
- 95c7c69: Clarifies consumer documentation for parser-backed entity intake APIs.

### Patch Changes

- @studnicky/types@13.0.0

## 12.2.1

### Patch Changes

- 9b93e0f: Clarifies consumer documentation for parser-backed entity intake APIs.
- @studnicky/types@12.2.1

## 12.2.0

### Patch Changes

- @studnicky/types@12.2.0

## 12.1.1

### Patch Changes

- @studnicky/types@12.1.1

## 12.1.0

### Patch Changes

- Updated dependencies [aa12145]
  - @studnicky/types@12.1.0

## 12.0.1

### Patch Changes

- Updated dependencies [ae381ef]
  - @studnicky/types@12.0.1

## 12.0.0

### Patch Changes

- @studnicky/types@12.0.0

## 11.1.0

### Patch Changes

- Updated dependencies [44865fd]
  - @studnicky/types@11.1.0

## 11.0.1

### Patch Changes

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

- e703bcd: Adds the missing `tsconfig.json` project reference to `@studnicky/types`, fixing a `tsc -b`
  build-order failure ("Cannot find module '@studnicky/types'") on a from-scratch build.
- Updated dependencies [d05cb42]
  - @studnicky/types@11.0.0
