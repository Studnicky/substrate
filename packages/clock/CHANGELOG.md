# Changelog

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Clock` class with injectable `ClockProviderInterface` for wall-clock (`now()`) and monotonic nanosecond (`hrtime()`) time, with per-instance monotonicity enforcement.
- `VirtualClockProvider` and `VirtualTimeCounter` for deterministic test scenarios — advance time explicitly via `VirtualTimeCounter.advance(ms)` with all paired providers seeing the change immediately.
- `RealTimeClockProvider` backed by `Date.now()` and `performance.now()`, with optional `offsetMs` constructor parameter for clock-skew correction.
- `ClockProviderInterface` as the extension point for custom time sources, enabling full DI and subclass override via `readNow()` and `readHrtime()` seams on `Clock`.
