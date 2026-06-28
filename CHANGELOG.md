# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
