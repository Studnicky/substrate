# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `RealTimeScheduler` — one-shot and repeating timers backed by `setTimeout` and `setInterval`, with per-task `cancel()` and bulk `cancelAll()`.
- `VirtualScheduler` — deterministic min-heap scheduler driven by a shared `VirtualTimeCounter`; time advances only via `advance(ms)`, `runUntil(atMs)`, or `runAll()`, making test behaviour fully reproducible.
- Injectable provider pattern via `SchedulerProviderInterface` — swap real and virtual implementations without touching call-site code.
- Lifecycle hooks (`onSchedule`, `onFire`, `onCancel`, `onCancelAll`, and virtual-only `onAdvance`, `onRunUntil`) and protected extension seams on both classes for subclass-based observability and backend substitution.
