# Changelog

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/clock@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `Delay.sleep(ms, options?)` and `Delay.value(ms, value, options?)` — resolve a `Promise` after a scheduled delay. Accept an optional `scheduler` (`SchedulerProviderType`, default `RealTimeScheduler`) and `clock` (`ClockProviderType`, default `RealTimeClockProvider`), so tests can inject a `VirtualScheduler` + `VirtualClockProvider` pair sharing a `VirtualTimeCounter` to resolve deterministically as virtual time advances.

### Changed

- `MinimumHeap`, `RealTimeScheduler`, and `VirtualScheduler` are constructed through `Class.create(...)` and `Class.builder().build()`. Public constructors are replaced with `protected` constructors; stray `new Class(...)` from outside the class files is a compile error. Each class has a corresponding `*Builder` (single-export file) exported from the package barrel.
- `VirtualScheduler.create({ counter })` accepts an options object. The builder exposes `withCounter()`. The constructor validates the injected counter and throws `SchedulerError` if missing.

## [1.0.0] - 2026-06-22

### Added

- `RealTimeScheduler` — one-shot and repeating timers backed by `setTimeout` and `setInterval`, with per-task `cancel()` and bulk `cancelAll()`.
- `VirtualScheduler` — deterministic min-heap scheduler driven by a shared `VirtualTimeCounter`; time advances only via `advance(ms)`, `runUntil(atMs)`, or `runAll()`, making test behaviour fully reproducible.
- Injectable provider pattern via `SchedulerProviderInterface` — swap real and virtual implementations without touching call-site code.
- Lifecycle hooks (`onSchedule`, `onFire`, `onCancel`, `onCancelAll`, and virtual-only `onAdvance`, `onRunUntil`) and protected extension seams on both classes for subclass-based observability and backend substitution.
