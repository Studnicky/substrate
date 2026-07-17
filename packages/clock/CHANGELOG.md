# Changelog

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. Fluent builders assemble their options object via `@studnicky/types`'s `PickDefined.from()` instead of manual spread-ternary chains. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `Clock`, `RealTimeClockProvider`, `VirtualClockProvider`, and `VirtualTimeCounter` constructors are now protected. All instances are created via `Class.create(...)` or `Class.builder()....build()`, with validation consolidated in the constructor.
- `RealTimeClockProvider` construction normalizes to an options object: `RealTimeClockProvider.create({ offsetMs })`. Builder: `RealTimeClockProvider.builder().withOffsetMs(500).build()`.
- `VirtualTimeCounter` construction normalizes to an options object: `VirtualTimeCounter.create({ startMs })`. Previously silently clamped negative `startMs` to 0; now throws `ClockError` on non-finite or negative values. Builder: `VirtualTimeCounter.builder().withStartMs(1000).build()`.
- `VirtualClockProvider.create(counter)` and `VirtualClockProvider.builder().withCounter(counter).build()` are the construction paths.
- `Clock.create(provider)` and `Clock.builder().withProvider(provider).build()` are the construction paths.

### Added

- `ClockBuilder`, `RealTimeClockProviderBuilder`, `VirtualClockProviderBuilder`, `VirtualTimeCounterBuilder` — fluent builder classes for all four service classes.
- `RealTimeClockProviderOptionsEntity`, `VirtualTimeCounterOptionsEntity` — schema-validated option types for plain-data configuration.

## [1.0.0] - 2026-06-22

### Added

- `Clock` class with injectable `ClockProviderInterface` for wall-clock (`now()`) and monotonic nanosecond (`hrtime()`) time, with per-instance monotonicity enforcement.
- `VirtualClockProvider` and `VirtualTimeCounter` for deterministic test scenarios — advance time explicitly via `VirtualTimeCounter.advance(ms)` with all paired providers seeing the change immediately.
- `RealTimeClockProvider` backed by `Date.now()` and `performance.now()`, with optional `offsetMs` constructor parameter for clock-skew correction.
- `ClockProviderInterface` as the extension point for custom time sources, enabling full DI and subclass override via `readNow()` and `readHrtime()` seams on `Clock`.
