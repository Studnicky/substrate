# Changelog

## 7.0.1

### Patch Changes

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
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `CircularBuffer` constructor is now `protected`. Use `CircularBuffer.create(options)` or `CircularBuffer.builder().withCapacity(n).build()` to construct instances. Subclasses that call `super(options)` are unaffected.

### Added

- `CircularBuffer.create(options?)` — validated static factory; the single construction entry point.
- `CircularBuffer.builder<T>()` — returns a `CircularBufferBuilder` for fluent configuration via `withCapacity()` and `withOverflow()`.
- `CircularBufferBuilder` class — fluent builder with `withCapacity(n)`, `withOverflow(mode)`, and `build()`. Exported from the package root and from the `circular-buffer` subpath.

## [1.0.0] - 2026-06-22

### Added

- Generic `CircularBuffer<T>` class with fully typed push and shift operations
- O(1) amortized `push` and O(1) `shift` with FIFO ordering
- Automatic capacity growth by doubling when the buffer is full — items are never evicted
- Protected lifecycle hooks (`onGrow`, `onPush`, `onShift`) for subclass observation of buffer events
