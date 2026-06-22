# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Clock` class with injectable `ClockProviderInterface` for wall-clock (`now()`) and monotonic nanosecond (`hrtime()`) time, with per-instance monotonicity enforcement.
- `VirtualClockProvider` and `VirtualTimeCounter` for deterministic test scenarios — advance time explicitly via `VirtualTimeCounter.advance(ms)` with all paired providers seeing the change immediately.
- `RealTimeClockProvider` backed by `Date.now()` and `performance.now()`, with optional `offsetMs` constructor parameter for clock-skew correction.
- `ClockProviderInterface` as the extension point for custom time sources, enabling full DI and subclass override via `readNow()` and `readHrtime()` seams on `Clock`.
