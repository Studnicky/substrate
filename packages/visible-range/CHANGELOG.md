# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-07-08

### Added

- `VisibleRange` class: pure index/offset arithmetic computing the inclusive `[start, end]` index range of items currently visible in a virtualized list, given a scroll offset, viewport size, item-size accessor, and overscan count. Zero DOM dependency — never references `window`, `document`, or `ResizeObserver`.
- Fixed-size mode (`itemSize`) for O(1) division-based range math, and variable-size mode (`estimateSize`) for binary-searched cumulative-offset range math with `measureItem()` corrections once a real size is known.
- `VisibleRangeBuilder` fluent builder; `onRangeChange` protected hook, overridable via subclassing, firing from `getRange()` only when the computed range differs from the previous one; `VisibleRangeError`, `VisibleRangeConfigInterface`, and `VisibleRangeType`.
