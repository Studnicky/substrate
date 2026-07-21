# Changelog

## 7.0.1

### Patch Changes

- @studnicky/config@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. Fluent builders assemble their options object via `@studnicky/types`'s `PickDefined.from()` instead of manual spread-ternary chains. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/config@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2026-07-08

### Changed

- Exported constant objects use `SCREAMING_SNAKE_CASE`: `DEFAULT_DISPATCHER_CONFIG`, `POOL_HEALTH`, and `VALIDATION_LIMITS`.

### Changed

- `FetchClient`, `InterceptorManager`, and `UndiciDispatcher` constructors are non-public (`protected`). Use `FetchClient.create(config)`, `InterceptorManager.create()`, and `UndiciDispatcher.create(config)` to construct instances.

## [1.0.0] - 2026-06-22

### Added

- FetchClient class with static `create()` factory and direct HTTP verb methods
- Request and response interceptor pipeline — single function or ordered array, applied per-client and per-request
- Protected hook points `onRequestStart`, `onResponseSuccess`, `onRequestError` for subclass telemetry without modifying core behavior
- Undici connection pool dispatcher, query-string utilities, and typed error hierarchy (AbortError, TimeoutError, HTTPError, and more)
