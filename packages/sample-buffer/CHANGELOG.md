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

### Added

- `SampleBuffer.create({ capacity })` static factory — the single validated construction entry point.
- `SampleBufferOptionsEntity` namespace with JSON Schema, `Type`, and `validate` for options validation.
- Constructor is now `protected`; construction through `new SampleBuffer()` outside the class is no longer possible.
- `@studnicky/sample-buffer` is the sole public code entrypoint.

## [1.0.0] - 2026-06-22

### Added

- Fixed-capacity circular buffer that maintains a sliding window of numeric samples, evicting the oldest sample when capacity is reached.
- `percentile(pct)` method with linear interpolation for any percentile in the 0–100 range; returns `undefined` on an empty buffer.
- Protected lifecycle hooks (`onEvict`, `onPush`, `onClear`, `onPercentile`) with no-op defaults for subclass observability.
- `length` and `isFull` accessors for introspecting current buffer state.
