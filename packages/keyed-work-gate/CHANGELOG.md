# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-07-08

### Added

- `KeyedWorkGate` class composing `@studnicky/mutex` and `@studnicky/concurrency`'s `Coalesce` into two keyed work-gating patterns: `runSingleFlight` collapses concurrent same-key callers into one execution (whose single execution still acquires the key's `Mutex`), and `runSerialized` bypasses coalescing and routes directly through the `Mutex` so every call runs.
- `getMutex()`/`getCoalesce()` transparency getters onto the exact composed instances, so a caller who subclassed `Mutex`/`Coalesce` for their own hooks keeps full access to those subclasses.
- `KeyedWorkGateBuilder` fluent builder and `KeyedWorkGateConfigType`, accepting either pre-built (optionally subclassed) primitive instances or config shapes passed straight to each primitive's own `create()`.
