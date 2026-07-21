# Changelog

## 7.0.1

### Patch Changes

- @studnicky/circular-buffer@7.0.1
- @studnicky/config@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/sample-buffer@7.0.1
- @studnicky/signal@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/sample-buffer@7.0.0
  - @studnicky/circular-buffer@7.0.0
  - @studnicky/config@7.0.0
  - @studnicky/json@7.0.0
  - @studnicky/signal@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The package root is the sole public code entrypoint for throttle behavior, entities, errors, validators, and `ThrottleInterface`; scheduling constants remain implementation details.
- `Throttle` constructor is protected; instances are created via `Throttle.create(config?)`.
- FSM state is exported as `ThrottleStateEntity.Type`; adaptive, configuration, statistics, and validation data remain schema-backed entity types, while runtime behavior is an interface. Runtime statistics are validated through `ThrottleStatsEntity.validate`.

## [1.0.0] - 2026-06-22

### Added

- `Throttle` class with configurable `concurrencyLimit` (default 10) and sliding window execution — queued operations start as soon as a slot is released.
- `execute<T>(fn)` returns `Promise<T | undefined>`; operations resolve with `undefined` when the throttle is aborted (detach-and-abandon pattern).
- `abort(options?)` cancels all queued and active operations immediately (or after a grace-period timeout), returning `AbortResultEntity.Type` with cancelled, completed, and timedOut counts.
- Optional adaptive concurrency via `AdaptiveConfigEntity.Type` automatically scales the concurrency limit up or down based on observed p95 latency.
