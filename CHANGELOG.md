# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
