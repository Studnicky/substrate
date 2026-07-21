# Changelog

## 7.0.1

### Patch Changes

- @studnicky/circular-buffer@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. Fluent builders assemble their options object via `@studnicky/types`'s `PickDefined.from()` instead of manual spread-ternary chains. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/circular-buffer@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Semaphore`: counting permit gate with `acquire()` returning an idempotent release function, `withPermit()` for automatic acquire/release around a callback, and `available`/`permits` getters.
- `Coalesce`: keyed async coalescing that reserves the shared completion before `onCoalesceStart` and the factory, so reentrant and concurrent callers join the same in-flight promise. A start-hook or factory rejection is shared by the leader and every joiner; `isInflight()` provides observability.
- `Channel`: string-keyed fan-in async generator inbox; `publish()` buffers items to a named key, `subscribe()` yields them as an async generator, `close()` terminates all active subscribers.
- `AsyncIter`: static-method class with three async-iterable combinators — `merge()` for FIFO fan-in of N sources, `filter()` for sync/async predicate filtering, and `enrich()` for left-join enrichment with null-passthrough.
