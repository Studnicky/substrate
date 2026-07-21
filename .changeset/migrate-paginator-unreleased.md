---
"@studnicky/paginator": major
---

### Changed

- Pagination state, events, and cursors use explicit discriminated entity and interface variants. `next(page, nextCursor)` accepts `PaginatorAvailableCursorInterface<TCursor> | PaginatorExhaustedCursorEntity.Type`, and lifecycle hooks compose the exported state and event variants directly.

### Added

- `Paginator<TPage, TCursor>` class tracking cursor/page-list state for a paginated data source. Composes an internal `@studnicky/fsm` `StateMachine` (`idle` → `hasMore` → `exhausted`, with `reset()` back to `idle` from any state) without fetching data itself — callers supply fetched pages via `next(page, nextCursor)`.
- `hasNext()`, `.pages`, `next()`, and `reset()` public API.
- Protected lifecycle hooks (`onTransition`, `onEnterState`, `onExitState`, `onTransitionRejected`) delegated from the internal machine for subclass-level observability, following the substrate no-op hook idiom.
