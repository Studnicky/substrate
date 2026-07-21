# Changelog

## 7.0.1

### Patch Changes

- @studnicky/clock@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

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

- `Delay.sleep(ms, { clock?, scheduler?, signal? })` resolves after a scheduler-aware delay. A native `AbortSignal` rejects with its exact reason, schedules nothing when already aborted, and cancels a pending scheduled task on later abort.

### Changed

- The package root is the sole public code entrypoint and includes `PendingTaskInterface`, `ScheduledTaskInterface`, and `SchedulerProviderInterface` alongside scheduler behavior.
- `MinimumHeap`, `RealTimeScheduler`, and `VirtualScheduler` use `Class.create(...)`. Their constructors are protected.
- `VirtualScheduler.create({ counter })` accepts an options object. The constructor validates the injected counter and throws `SchedulerError` if missing.

## [1.0.0] - 2026-06-22

### Added

- `RealTimeScheduler` — one-shot and repeating timers backed by `setTimeout` and `setInterval`, with per-task `cancel()` and bulk `cancelAll()`.
- `VirtualScheduler` — deterministic min-heap scheduler driven by a shared `VirtualTimeCounter`; time advances only via `advance(ms)`, `runUntil(atMs)`, or `runAll()`, making test behaviour fully reproducible.
- Injectable provider pattern via `SchedulerProviderInterface` — swap real and virtual implementations without touching call-site code.
- Lifecycle hooks (`onSchedule`, `onFire`, `onCancel`, `onCancelAll`, and virtual-only `onAdvance`, `onRunUntil`) and protected extension seams on both classes for subclass-based observability and backend substitution.
