---
title: '@studnicky/paginator'
description: Cursor/page-list state tracker for paginated data sources.
---

# @studnicky/paginator

> Cursor/page-list state tracker for paginated data sources.

## Install

```bash
pnpm add @studnicky/paginator
```

## Usage

`Paginator` does not fetch data — the caller supplies each fetched page via `next(page, nextCursor)`, and the tracker reports whether more pages are expected and holds the pages received so far:

<<< ../../packages/paginator/examples/observedPaginator.ts#usage

`nextCursor` is `PaginatorAvailableCursorInterface<TCursor> | PaginatorExhaustedCursorEntity.Type`. Pass `{ exhausted: false, cursor }` when another page is available and `{ exhausted: true }` when the source is exhausted. The explicit discriminant keeps `undefined` available as a legitimate cursor value.

The `pages` getter returns a defensive snapshot in receipt order.

## Observability hooks

Subclass `Paginator` and override any protected hook to inject trace logging, metrics, or side-effects at the exact stage where they are needed. Hooks should stay fast and non-blocking; observer-hook failures are contained so pagination state still wins.

| Hook | When it fires | Args |
|------|--------------|------|
| `onTransition(from, to, event)` | After a successful state transition, before the new state is returned | `from` and `to`: `PaginatorIdleStateEntity.Type \| PaginatorHasMoreStateInterface<TPage, TCursor> \| PaginatorExhaustedStateInterface<TPage>`; `event`: `PaginatorResetEventEntity.Type \| PaginatorPageReceivedEventInterface<TPage, TCursor>` |
| `onEnterState(state)` | When entering a new state variant (not called when the variant is unchanged) | `state: PaginatorIdleStateEntity.Type \| PaginatorHasMoreStateInterface<TPage, TCursor> \| PaginatorExhaustedStateInterface<TPage>` |
| `onExitState(state)` | When exiting a state variant (not called when the variant is unchanged) | `state: PaginatorIdleStateEntity.Type \| PaginatorHasMoreStateInterface<TPage, TCursor> \| PaginatorExhaustedStateInterface<TPage>` |
| `onTransitionRejected(state, event, reason)` | When `next()` is called after the source is already exhausted | `state`: the explicit state union above; `event`: `PaginatorResetEventEntity.Type \| PaginatorPageReceivedEventInterface<TPage, TCursor>`; `reason: string` |

The base class never calls any logger or metrics library. All hooks are no-ops by default.

## Exported contracts

Pure discriminants and fixed pure-data variants are entity-derived: `PaginatorAvailableCursorDiscriminantEntity.Type`, `PaginatorExhaustedCursorEntity.Type`, `PaginatorExhaustedStateDiscriminantEntity.Type`, `PaginatorHasMoreStateDiscriminantEntity.Type`, `PaginatorIdleStateEntity.Type`, `PaginatorPageReceivedEventDiscriminantEntity.Type`, and `PaginatorResetEventEntity.Type`. Generic composite variants are `PaginatorAvailableCursorInterface<TCursor>`, `PaginatorHasMoreStateInterface<TPage, TCursor>`, `PaginatorExhaustedStateInterface<TPage>`, and `PaginatorPageReceivedEventInterface<TPage, TCursor>`.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/paginator)
