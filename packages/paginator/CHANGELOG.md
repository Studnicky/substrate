# Changelog

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/fsm@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/fsm@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `Paginator<TPage, TCursor>` class tracking cursor/page-list state for a paginated data source. Composes an internal `@studnicky/fsm` `StateMachine` (`idle` → `hasMore` → `exhausted`, with `reset()` back to `idle` from any state) without fetching data itself — callers supply fetched pages via `next(page, nextCursor)`.
- `hasNext()`, `.pages`, `next()`, and `reset()` public API.
- Protected lifecycle hooks (`onTransition`, `onEnterState`, `onExitState`, `onTransitionRejected`) delegated from the internal machine for subclass-level observability, following the substrate no-op hook idiom.
