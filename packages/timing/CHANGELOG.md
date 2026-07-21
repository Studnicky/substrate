# Changelog

## 7.0.1

### Patch Changes

- @studnicky/config@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/config@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `Timing.create(options?)` and `NoOpTiming.create()` are the only public construction paths for timing trackers.
- `TimingEvent.create(config)` creates frozen event data in one step from required `component` and `operation` fields plus optional `status`.
- Time units and timing statuses are exported as `TimeUnitEntity.Type` and `TimingStatusEntity.Type`; event and runtime contracts are interfaces.
- `@studnicky/timing` is the sole public code entrypoint and exports `TimingInterface`.

## [1.0.0] - 2026-06-22

### Added

- `Timing` tracker with configurable `maxEvents` cap (LRU eviction) and `precision` options for nanosecond-resolution elapsed time output.
- `TimingEvent` factory producing structured `component.operation[.status]` event names for consistent metric keys across instrumented code.
- `TIMING_STATUS` constants covering the full lifecycle vocabulary (`start`, `complete`, `error`, `timeout`, `hit`, `miss`, `queued`, `dequeued`, `waiting`, `acquired`, `released`, `abort`).
- `NoOpTiming` implementation satisfying `TimingInterface` with zero overhead — suitable for test contexts and production code paths where timing collection is disabled.
- Protected `readHrtime()` and `onEvent()` override seams on `Timing` for deterministic testing and instrumentation without altering the public API.
