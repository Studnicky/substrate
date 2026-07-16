# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [6.0.0] - 2026-07-16

### Added

- `@studnicky/eslint-config`: new `folder-content-shape` rule enforces that `interfaces/` folders hold `interface` declarations (runtime contracts), `types/` folders hold `type` alias declarations (data shapes), and other folders keep data constants (regex, enums, frozen collections — not runtime functions) grouped under a `constants/` folder (or `fixtures/` for test/example data). Merges the former `folder-declaration-shape`, `constants-folder-required`, and `entity-namespace` rules. Regex literals (`/pattern/flags` syntax, or `new RegExp('pattern', ...)` with an inlined string pattern) are zero-tolerance — a single inline regex is flagged, unlike the 2+ threshold for other constants, since a regex pattern is a data constant exactly like an enum value and must never be declared inline.
- `@studnicky/eslint-config`: new hexagonal-architecture layer-boundary rule category for consuming applications — `layer-import-boundary` (enforces a configurable layer allow-matrix on imports), `domain-purity` (forbids impure imports/calls inside a configurable domain layer), `adapter-only-import` (restricts concrete third-party dependencies to a configurable adapters layer), and `known-types-outside-adapters` (bans `any`/`unknown` types everywhere outside a configurable adapters layer — adapters are the only layer permitted to hold untyped intake data; their job is converting it to known shapes). `hash-private-fields` gains an optional, layer-scoped `// external-contract: <reason>` directive-comment exemption for intake/hook-body fields whose underscore-prefixed names are dictated by a fixed external contract. `HexagonalSuite.create(...)` wires all four rules from one shared layers/sourceRoot configuration.
- `@studnicky/eslint-config`: new `whole-canonical-types` rule bans deriving `Partial<X>`/`Pick<X, K>`/`Omit<X, K>` from any canonical, codebase-owned named type or interface. A partial type masks the real data shape; consumers must always be aware of every property a canonical shape carries. There is no directive-comment exemption for this rule — genuinely different shapes must be defined explicitly, in full.
- `@studnicky/eslint-config`: new `type-alias-invariants` rule merges the former `type-alias-must-end-type`, `no-readonly-in-data-type`, `no-type-aliasing`, `types-derived-from-schema`, and `no-prefer-existing-type` rules into one shared `TSTypeAliasDeclaration`/`TSInterfaceDeclaration` visitor with five independently toggleable checks. Types imported from external (`node_modules`) packages are automatically exempt from the schema-derivation check via real type-checker resolution, not manual directives.
- `@studnicky/eslint-config`: domain-grouped suite/preset configs — `entitySuite`, `hygieneSuite`, `v8Suite` (plain `Linter.Config` objects), and `HexagonalSuite.create(...)` (a factory, since its rules share layer configuration) — for one-import consumption instead of wiring every rule individually.

### Changed

- `@studnicky/eslint-config`: every rule id previously framed as a prohibition (`no-*`) is renamed to a positive framing, so a rule's name states what it enforces rather than what it forbids: `no-any-unknown-outside-adapters` → `known-types-outside-adapters`, `no-bind-apply-call` → `direct-invocation-only`, `no-concat-in-loops` → `array-concat-outside-loops` (`@studnicky/v8`), `no-export-alias` → `canonical-export-names`, `no-freestanding-verb-noun` → `static-method-verbs`, `no-partial-canonical-type` → `whole-canonical-types`, `no-project-internal-acronyms` → `descriptive-identifiers`, `no-spread-in-loops` → `array-spread-outside-loops` (`@studnicky/v8`), `no-suppression-comments` → `clean-diagnostics`, `no-this-alias` → `lexical-this-only`, `no-trivial-shim` → `inline-trivial-logic`, `no-underscore-private` → `hash-private-fields`. Rule behavior and `messageId`s are unchanged — only the rule id, exported symbol, and filename changed. **Breaking** for any consumer referencing these rule ids directly.
- `@studnicky/eslint-config`: `static-method-verbs` (formerly `no-freestanding-verb-noun`) no longer detects violations by matching a hardcoded list of English verb-prefix names; it now uses real structural (and optionally type-aware) AST analysis via a configurable `mode: 'any' | 'structural' | 'typed'` option (default `'structural'`). `single-export`'s error-class detection now resolves the superclass through the TypeScript type checker instead of checking whether its name ends in `"Error"`.
- `@studnicky/eslint-config`: `type-alias-invariants`'s checks now sequence so contradictory advice on the same declaration can't fire together — a verdict that recommends deleting a declaration entirely (`noAliasing`'s naked/primitive/generic-forwarding aliases, `noPreferExisting`'s exact/near/subsumed duplicates of an imported type) suppresses `mustEndType`'s "rename it" advice and `derivedFromSchema`'s "move it into an entity" advice on that same node, since renaming or entity-ifying a declaration that should be deleted is contradictory guidance. The `subsumedMatch` message no longer recommends `Pick<X, K>` as a fix, since that would directly violate `whole-canonical-types`.

### Fixed

- Relocated 40 `type`/`interface` declarations across 11 packages (`batch`, `clock`, `errors`, `fetch`, `json`, `logger`, `retry`, `scheduler`, `throttle`, `timing`, `visible-range`) to the folder matching their actual declaration form, per the new `folder-content-shape` rule.
- `@studnicky/request-executor` now imports `ClientConfigType`/`RequestContextType`/`ResponseContextType` from `@studnicky/fetch/types` instead of the now-stale `@studnicky/fetch/interfaces` subpath.
- Converted 60 freestanding module-scope functions across `@studnicky/eslint-config`'s own rule source, `errors`, `retry`, `throttle`, `config`, `logger`, and 13 demo example scripts to static class methods, closing the real violations `static-method-verbs`' (formerly `no-freestanding-verb-noun`) naming-heuristic previously missed.
- Resolved all `derivedFromSchema`/`type-alias-invariants` violations surfaced by enabling full enforcement repo-wide: converted inline type-literal aliases into JSON-Schema-derived entity namespaces (renamed `*TypeEntity` → `*Entity`, since the namespace itself is the entity and already contains `.Type`) across `batch`, `boundary-kit`, `circular-buffer`, `concurrency`, `config`, `entity-store`, `errors`, `fetch`, `flag-evaluator`, `health-registry`, `idempotency-guard`, `json`, `logger`, `mutex`, `resilience`, `retry`, `sample-buffer`, `scheduler`, `system`, `throttle`, `timing`, `virtual-fs`, `visible-range`, and 17 smaller packages, or added honest `// json-schema-uninexpressible: <reason>` directives where a shape is genuinely inexpressible (function types, generics, `unknown`, class instances, opaque handles).
- Resolved all 39 `whole-canonical-types` violations surfaced by enabling the new rule repo-wide: dropped redundant `Partial<X>` wrappers where `X` was already fully optional, and defined explicit fully-spelled-out types where a genuine subset was needed, across `batch`, `boundary-kit`, `circular-buffer`, `eslint-config`, `fetch`, `file-lock`, `request-executor`, `retry`, `sample-buffer`, `virtual-fs`, and `visible-range`.

## [5.1.1] - 2026-07-09

### Changed

- Documentation now distinguishes passive observer hooks from in-band behavioral hooks, removes stale package-count/version drift, and aligns the GitHub Pages package pages plus affected package READMEs with the shipped hook semantics.

### Fixed

- `@studnicky/fsm` `EffectInterpreter#drain()` now always clears its internal draining flag, so a throwing observer or effect-path hook no longer wedges subsequent `send()` calls into silent no-ops.
- Passive observer hooks across the shipped primitives no longer replace committed results, committed state transitions, or canonical domain errors when those hooks throw; the affected packages now keep the real operation outcome authoritative and are covered by regression tests.

## [5.1.0] - 2026-07-09

### Added

- 15 new packages: `@studnicky/boundary-kit`, `@studnicky/bounded-dispatcher`, `@studnicky/entity-store`, `@studnicky/flag-evaluator`, `@studnicky/health-registry`, `@studnicky/idempotency-guard`, `@studnicky/keyed-rate-limiter`, `@studnicky/keyed-work-gate`, `@studnicky/memoize`, `@studnicky/paginator`, `@studnicky/process-kit`, `@studnicky/request-executor`, `@studnicky/sliding-window-limiter`, `@studnicky/visible-range`, and `@studnicky/worker-pool`. See each package's own README for its API.
- `ClampedConfig` soft-correction clamping utility in `@studnicky/config`, mirroring `ConfigValidation`'s static hook idiom.
- `Delay.sleep()`/`Delay.value()` in `@studnicky/scheduler` — virtual-time-aware delay helpers composing `Clock` and `Scheduler`.
- `InterpreterHistory` in `@studnicky/fsm` — a bounded recorder of an `EffectInterpreter`'s own transitions, composing `CircularBuffer`.
- 15 new custom ESLint rules (31 → 46 total): `all-types-are-entities`, `constants-folder-required`, `interface-suffix`, `interfaces-compose-named-types`, `no-project-internal-acronyms`, `no-underscore-private`, `types-derived-from-schema`, `v8/array-from-map-callback`, `v8/conditional-property-assignment`, `v8/dynamic-property-access`, `v8/inline-arrow-functions`, `v8/inline-functions`, `v8/max-switch-cases`, `v8/memoize-array-length`, `v8/object-spread`.
- Documentation pages for all 15 new packages and all 15 new ESLint rules, plus homepage cards for both.

### Fixed

- `SchemaValidator.compile()` is now idempotent for a schema `$id` already registered on the shared Ajv instance, instead of throwing on re-registration.
- Several shipped classes that delegate a composed primitive's lifecycle hook to their own same-named hook (`KeyedRateLimiter`, `IdempotencyGuard`, `Memoize`, `Paginator`) now correctly chain through `super.<hook>()` before their own logic, so the composition remains sound if the base hook ever gains real behavior or a consumer subclasses further.
- Rewrote the Pattern Composition guide, which described Boundary Kit, Coordination Kit, and Process Kit as "documentation-only, no package exists" — all three now ship as real packages.
- Mermaid diagrams on the architecture page previously rendered as empty, contentless elements for any reader or crawler without JavaScript; both now carry a text-equivalent fallback.
- Corrected three new packages that were versioned to match the existing lockstep release version instead of their own first release.

## [5.0.0] - 2026-07-08

### Changed

- `@studnicky/eslint-config` tightens the structural export rules. `@studnicky/no-export-alias` now forbids any non-index re-export path, including direct re-exports, star re-exports, and import-then-export forwarding for both value and type bindings. `@studnicky/single-export` now recognizes restricted topology both as directories and fractal filename suffixes, requires constant modules to export only `SCREAMING_SNAKE_CASE` symbols, and narrows enum exemptions to enum-and-constant-only files. `@studnicky/no-suppression-comments` now also rejects coverage suppression markers including `c8 ignore`, `c8-ignore`, and `istanbul ignore entirely`.
- **Breaking:** `@studnicky/fetch` renames its exported constant objects to `DEFAULT_DISPATCHER_CONFIG`, `POOL_HEALTH`, and `VALIDATION_LIMITS`.
- **Breaking:** `@studnicky/logger` renames its exported log-level constants to `LOG_LEVEL` and `LOG_LEVEL_MAP`.

## [4.0.0] - 2026-06-28

### Changed

- **Breaking:** `@studnicky/retry` replaces the `retryInterceptor` pipeline with a protected `onRetryScheduled(context)` lifecycle hook. Subclass `Retry` and override it to set `context.delayMs` (using a shipped `BackoffStrategy`), set `context.abort` to stop retrying, or mutate `context.state` across attempts (the hook may be async). Removed: the `retryInterceptor` config field and builder method, the `RetryInterceptorType` type, and the `isRetryInterceptor` guard. The package no longer depends on `@studnicky/pipeline`.
- **Breaking:** `@studnicky/batch` replaces the `batchConcurrent` function and its `hooks` options object with a `Batch` class exposing protected lifecycle hooks (`onBatchStart`, `onItemStart`, `onItemSuccess`, `onItemError`, `onItemSettled`, `onConcurrencySaturated`, `onBatchComplete`). Construct with `Batch.create(maxConcurrent?)` and subclass to observe. Removed: `batchConcurrent`, `BatchHooksInterface`, and `BatchOptionsInterface`.

## [3.0.0] - 2026-06-26

### Added

- `@studnicky/no-readonly-in-data-type` ESLint rule (autofixable, type-checker driven): forbids `readonly` modifiers baked into exported `type` alias data definitions. Detection is proven through the type system with no name matching — generic transformation types (mapped types like `DeepReadonlyType`, conditional types like `DeepMergeType`) resolve to types with no concrete readonly members and are never flagged, and a type that merely references a readonly type is left alone. The fix removes the `readonly` modifiers.

### Changed

- **Breaking:** Exported data `type` aliases across the toolkit no longer carry `readonly` modifiers. A `type` describes shape, not access policy; consumers declare immutability at the use site (`readonly`, `Readonly<T>`, `DeepReadonlyType<T>`). This includes `@studnicky/types` `JsonValueType` and the `*Type` option/result shapes across the primitives. `interface` contracts and all use-site `readonly` (parameters, class fields, `Readonly<T>` references) are unchanged.
- **Breaking:** `@studnicky/fetch` replaces the request/response interceptor mechanism with protected override lifecycle hooks. Subclass `FetchClient` and override `onRequest(context)` / `onResponse(context)` to transform the outgoing request or incoming response. Removed: the `requestInterceptor`/`responseInterceptor` config fields and builder methods, `InterceptorManager`, and the `RequestInterceptorType`/`ResponseInterceptorType` exports; the context types are now `RequestContextType` / `ResponseContextType`. The package no longer depends on `@studnicky/pipeline`.
- `@studnicky/interface-must-be-contract` is now type-checker driven and autofixable. It resolves each member's type through the checker and flags an interface only when every member is JSON-serializable — including generic type-parameter bodies such as `interface Box<T> { v: T }`. The fix rewrites a data-shape interface to a `type` alias, preserving `export`/`declare` modifiers, generics, and `extends` (as an intersection), and is skipped for declaration-merged or globally-augmented interfaces.

## [2.0.0] - 2026-06-25

### Changed

- `@studnicky/eslint-config` is now a standard ESLint plugin rather than a config factory. Register the `plugin` and `v8Plugin` exports under the `@studnicky` and `@studnicky/v8` namespaces in your flat config and enable rules directly. **Breaking:** the `createEslintConfig` factory and the `EslintConfigOptionsType` type are removed, and the package no longer carries a runtime dependency on `@studnicky/config`.

## [1.3.0] - 2026-06-25

### Changed

- `@studnicky/fetch` is now isomorphic: requests run over the runtime's native `fetch` in both the browser and Node, with the interceptor pipeline, timeout, request builder, and URL utilities working identically in each. The undici connection-pool dispatcher is a Node-only enhancement — disabled by default and selected by export condition; enabling it in a browser throws a clear error. Adds a live in-browser runnable demo and corrects the prior "Node-only" documentation.

## [1.2.0] - 2026-06-25

### Added

- `@studnicky/virtual-fs`: an in-memory, synchronous, subclass-first filesystem primitive — `VirtualFileSystem` with a fluent builder, `onCreate`/`onRead`/`onWrite`/`onRename`/`onDelete` lifecycle hooks, an injectable `@studnicky/clock` provider for deterministic `mtimeMs`, and an exported `FileSystemInterface` contract.
- In-browser runnable examples across the documentation: every package page ships press-to-run demos that execute the real package source in the browser (a `RunnableExample` component over a Sucrase-based runtime) and show live console output. Each stateful primitive demonstrates both its fluent builder and a lifecycle-hook subclass; stateless utilities show a usage demo.
- Formal ESLint plugin documentation: a dedicated **ESLint Plugins** section with an overview/install/config page and one page per rule (14 `@studnicky` configuration rules and 16 `@studnicky/v8` performance rules), wired into the sidebar. Importability is documented for the `createEslintConfig` factory and the raw `plugin`/`v8Plugin` objects via the `.`, `./plugin`, and `./v8` subpath exports.

### Changed

- `@studnicky/retry` and `@studnicky/throttle` are now isomorphic: the promisified delay runs on the global timer instead of `node:timers/promises`, so they execute in browsers as well as Node with identical behavior.
- `@studnicky/system` reads hardware information through a provider seam selected by export condition — Node uses `node:os`/`node:child_process`, browsers use `navigator` and WebGL (`WEBGL_debug_renderer_info`). The public `System` API is unchanged.
- `@studnicky/file-lock` performs all filesystem access through an injected `FileSystemInterface` (default Node `fs` adapter) and an injectable owner token (default `process.pid` in Node), so the same lock semantics run in the browser against a `VirtualFileSystem`.

## [1.1.0] - 2026-06-24

### Added

- Exhaustive `protected` observability hooks at every debug-relevant lifecycle stage across the primitives — no-ops by default, overridable without coupling the base implementation to any logging or metrics backend. Coverage spans `cache` (hit/miss/set/update/evict/expire/delete/clear), `event-bus` (publish/subscribe/deliver/enqueue/dequeue/drop/overflow/slow-consumer/handler-error), `resilience` (breaker trip/open/half-open/close, token-bucket, dead-letter), `fsm` (transition/enter/exit/effect/registry), `concurrency` (semaphore/channel/coalesce), `fetch` (full request lifecycle including per-interceptor stages), `scheduler` (fire-error/drift/miss), `pipeline` (per-stage), plus `clock`, `file-lock`, `circular-buffer`, `context`, `logger`, `mutex`, `sample-buffer`, `throttle`, `timing`, and `retry`.
- `batchConcurrent` accepts optional lifecycle-hook callbacks so the free-function API gains the same observability seams as the class-based primitives.
- `mutex` `onRelease` hook, distinct from the existing `afterRelease` seam.
- Runnable trace demos: each package ships an `examples/observed<Pkg>.ts` that overrides the hooks to print a realistic debug trace and self-verifies with assertions (`npx tsx packages/<pkg>/examples/observed<pkg>.ts`).
- Documentation: per-package **Observability hooks** tables (hook · when it fires · args) transcluded from the demos, and a central `concepts/lifecycle-hooks.md` page documenting the convention and mapping every hook to its package, wired into the nav and sidebar.
- Brand assets: docs logo, favicon set, and custom VitePress theme.

## [1.0.0] - 2026-06-24

### Added

- 18 subclass-first primitive packages: `batch`, `circular-buffer`, `clock`, `config`, `context`, `errors`, `eslint-config`, `fetch`, `json`, `logger`, `mutex`, `pipeline`, `retry`, `sample-buffer`, `scheduler`, `throttle`, `timing`, and `types`.
- `@studnicky/system` package: CPU/GPU/memory/platform detection for worker sizing.
- Explicit FSM `transition()` funnel on all stateful classes — `retry`, `throttle`, and `mutex` each expose a `protected transition()` seam so subclasses can hook state changes without monkey-patching.
- Pure-`static` utility classes for stateless operations — no exported singletons; consumers call static methods directly.
- `BaseError` taxonomy in `@studnicky/errors` providing a consistent error hierarchy with typed `context` payloads and structured serialisation.
- `protected` lifecycle hooks on every class — all telemetry seams are no-ops by default; subclasses override to add observability without coupling the base implementation to any logging or metrics backend.
- Shared ESLint flat-config package (`@studnicky/eslint-config`) with oxlint integration for the full workspace; exposes the V8-optimization rules to consumers via a `v8Plugin` registry and individual rule exports, with a dedicated `./v8` subpath alongside `./plugin`.
- Root monorepo toolchain: pnpm workspaces, TypeScript project references, oxlint, ESLint, and Vitest.
- Release and CI infrastructure: GitHub Actions workflows for CI, Pages deployment, publishing, changelog enforcement, security audits, stale issue management, and license checking.
- Brand assets and version-stamped social/share imagery: real logo wired into the docs nav, favicon set, and Open Graph `og-image`, with a `stamp-version` script that injects the package version and logo into the share templates.

### Fixed

- `@studnicky/system` is included in the root TypeScript build graph, so its `dist` output is produced and published from a clean build.

[5.1.0]: https://github.com/Studnicky/substrate/compare/v5.0.0...v5.1.0
[5.1.1]: https://github.com/Studnicky/substrate/compare/v5.1.0...v5.1.1
[6.0.0]: https://github.com/Studnicky/substrate/compare/v5.1.1...v6.0.0
