# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Release and CI infrastructure: GitHub Actions workflows for CI, Pages deployment, publishing, changelog enforcement, security audits, stale issue management, and license checking.
- `@studnicky/system` package: CPU/GPU/memory/platform detection for worker sizing.
- `@studnicky/eslint-config` exposes the V8-optimization rules to consumers: a `v8Plugin` registry and every individual rule are exported, with a dedicated `./v8` subpath alongside `./plugin`.
- Brand assets and version-stamped social/share imagery: real logo wired into the docs nav, favicon set, and Open Graph `og-image`, with a `stamp-version` script that injects the package version and logo into the share templates.

### Fixed

- `@studnicky/system` is included in the root TypeScript build graph, so its `dist` output is produced and published from a clean build.

## [1.0.0] - 2026-06-22

### Added

- 18 subclass-first primitive packages: `batch`, `circular-buffer`, `clock`, `config`, `context`, `errors`, `eslint-config`, `fetch`, `json`, `logger`, `mutex`, `pipeline`, `retry`, `sample-buffer`, `scheduler`, `throttle`, `timing`, and `types`.
- Explicit FSM `transition()` funnel on all stateful classes — `retry`, `throttle`, and `mutex` each expose a `protected transition()` seam so subclasses can hook state changes without monkey-patching.
- Pure-`static` utility classes for stateless operations — no exported singletons; consumers call static methods directly.
- `BaseError` taxonomy in `@studnicky/errors` providing a consistent error hierarchy with typed `context` payloads and structured serialisation.
- `protected` lifecycle hooks on every class — all telemetry seams are no-ops by default; subclasses override to add observability without coupling the base implementation to any logging or metrics backend.
- Shared ESLint 9 flat-config package (`@studnicky/eslint-config`) with oxlint integration for the full workspace.
- Root monorepo toolchain: pnpm workspaces, TypeScript project references, oxlint, ESLint, and Vitest.
