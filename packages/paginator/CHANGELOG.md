# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `Paginator<TPage, TCursor>` class tracking cursor/page-list state for a paginated data source. Composes an internal `@studnicky/fsm` `StateMachine` (`idle` → `hasMore` → `exhausted`, with `reset()` back to `idle` from any state) without fetching data itself — callers supply fetched pages via `next(page, nextCursor)`.
- `hasNext()`, `.pages`, `next()`, and `reset()` public API.
- Protected lifecycle hooks (`onTransition`, `onEnterState`, `onExitState`, `onTransitionRejected`) delegated from the internal machine for subclass-level observability, following the substrate no-op hook idiom.
