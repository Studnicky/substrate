# Changelog

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2026-06-28

### Changed

- **Breaking:** the `batchConcurrent` function and its `hooks` options object are replaced by a `Batch` class exposing protected lifecycle hooks (`onBatchStart`, `onItemStart`, `onItemSuccess`, `onItemError`, `onItemSettled`, `onConcurrencySaturated`, `onBatchComplete`). Construct with `Batch.create(maxConcurrent?)` and subclass to observe. Removed: `batchConcurrent`, `BatchHooksInterface`, and `BatchOptionsInterface`.

## [1.0.0] - 2026-06-22

### Added

- `batchConcurrent.process` — async generator that processes items in controlled batches with configurable concurrency, yielding `TResult[]` per batch as each completes.
- `batchConcurrent.processSettled` — variant with partial-failure support using `Promise.allSettled`, yielding `PromiseSettledResult<TResult>[]` per batch so individual rejections do not abort processing.
- Concurrency control via a numeric argument or `{ maxConcurrent }` options object; defaults to 10 concurrent operations per batch.
- Streaming/backpressure semantics via async generators — results are available batch-by-batch without waiting for all items to complete.
