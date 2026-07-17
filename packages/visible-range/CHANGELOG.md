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

## [1.0.0] - 2026-07-08

### Added

- `VisibleRange` class: pure index/offset arithmetic computing the inclusive `[start, end]` index range of items currently visible in a virtualized list, given a scroll offset, viewport size, item-size accessor, and overscan count. Zero DOM dependency — never references `window`, `document`, or `ResizeObserver`.
- Fixed-size mode (`itemSize`) for O(1) division-based range math, and variable-size mode (`estimateSize`) for binary-searched cumulative-offset range math with `measureItem()` corrections once a real size is known.
- `VisibleRangeBuilder` fluent builder; `onRangeChange` protected hook, overridable via subclassing, firing from `getRange()` only when the computed range differs from the previous one; `VisibleRangeError`, `VisibleRangeConfigInterface`, and `VisibleRangeType`.
