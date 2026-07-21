# Changelog

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/resilience@7.0.1
- @studnicky/retry@7.0.1
- @studnicky/throttle@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. Fluent builders assemble their options object via `@studnicky/types`'s `PickDefined.from()` instead of manual spread-ternary chains. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/retry@7.0.0
  - @studnicky/resilience@7.0.0
  - @studnicky/throttle@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-08

### Added

- `BoundaryKit` class composing `@studnicky/throttle`, `@studnicky/resilience`'s `CircuitBreaker`, and `@studnicky/retry` into the fixed composition order `throttle → circuitBreaker → retry → fn`, with `getThrottle()`/`getCircuitBreaker()`/`getRetry()` transparency getters onto the exact composed instances.
- `BoundaryKitAbortedError`, thrown by `execute()` when the composed `Throttle` discards a call, since `BoundaryKit#execute()` cannot surface that discard as a resolved `undefined` the way the bare `Throttle` does.
- `BoundaryKitBuilder` fluent builder and `BoundaryKitConfigInterface`, accepting either pre-built (optionally subclassed) primitive instances or config shapes passed straight to each primitive's own `create()`.

[Unreleased]: https://github.com/Studnicky/substrate/compare/main...develop
