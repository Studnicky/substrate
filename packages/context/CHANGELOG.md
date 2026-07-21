# Changelog

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Context` provides per-request async isolation via `AsyncLocalStorage`; `get` returns `unknown` for runtime narrowing and `tryGet` returns a presence-aware `{ found, value }` result.
- `ContextScope` FSM (`created → active → terminated`) returned from `Context.initialize()`, with `execute()` for store-bound execution and `terminate()` to extract final state.
- Protected extension hooks on `Context` support initialization, missing-context handling, and store operation observability.
- Direct `Context.create({ name })` construction with an overridable `validateBuild` hook.
