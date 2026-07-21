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

## [Unreleased]

### Changed

- The package root is the sole public code entrypoint. Mutex implementation constants remain internal.
- `Mutex.create(config?)` is the sole construction entry point; the constructor remains protected for subclassing.
- `Mutex.create()` uses `new this()` internally so subclass factories return the correct subclass type.
- Per-key FSM state is exported as the schema-backed `MutexKeyStateEntity.Type`.

## [1.0.0] - 2026-06-22

### Added

- Key-based `Mutex<K>` class with per-key serialization: concurrent operations on different keys run in parallel, operations on the same key queue serially.
- Three acquisition modes: `acquire()` returning a manual release function, `acquireDisposable()` for `await using` syntax (Node.js 24+), and `runExclusive()` for automatic acquire/release around a callback.
- Protected lifecycle hooks (`beforeAcquire`, `afterAcquire`, `onContended`, `beforeRelease`, `afterRelease`, `onTimeout`) for subclass-level observability without coupling the base class to any logging or metrics library.
- `MutexBuilder<K>` fluent builder with `.withMaxQueueSize()`, `.withTimeout()`, and `.withCoalescing()` for declarative configuration; optional request coalescing collapses concurrent `runExclusive` calls on the same key into a single in-flight operation.
