# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-07-08

### Added

- `SlidingWindowLimiter` class: sliding-window rate limiting via two selectable algorithms — `'log'` (exact, bounded timestamp queue pruned on every `consume()`) and `'counter'` (approximate, `O(1)`-space blended fixed-window counter).
- `consume(tokens?)` and `waitForToken(options?)`, shaped to structurally match the rate-limiter strategy seam `@studnicky/keyed-rate-limiter` expects from a single-instance limiter — no import between the two packages.
- `SlidingWindowLimiterBuilder` fluent builder; `SlidingWindowExhaustedError` thrown by `consume()` on limit exhaustion; `SlidingWindowLimiterConfigError` thrown on invalid configuration; `SlidingWindowLimiterError` package-level abstract error ancestor; `SlidingWindowLimiterOptionsInterface` and `SlidingWindowLimiterOptionsEntity`.
