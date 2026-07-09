# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-07-08

### Added

- `BoundaryKit` class composing `@studnicky/throttle`, `@studnicky/resilience`'s `CircuitBreaker`, and `@studnicky/retry` into the fixed composition order `throttle → circuitBreaker → retry → fn`, with `getThrottle()`/`getCircuitBreaker()`/`getRetry()` transparency getters onto the exact composed instances.
- `BoundaryKitAbortedError`, thrown by `execute()` when the composed `Throttle` discards a call, since `BoundaryKit#execute()` cannot surface that discard as a resolved `undefined` the way the bare `Throttle` does.
- `BoundaryKitBuilder` fluent builder and `BoundaryKitConfigType`, accepting either pre-built (optionally subclassed) primitive instances or config shapes passed straight to each primitive's own `create()`.
