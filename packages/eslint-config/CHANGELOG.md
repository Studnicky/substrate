# Changelog

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
