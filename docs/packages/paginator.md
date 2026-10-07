# @studnicky/paginator

## What it is

`@studnicky/paginator` tracks cursor and page-list state for a paginated data source. The caller fetches each page and passes it to `next()`; the package records the received pages, the cursor for the next page, and whether more pages are expected.

## What it is for

A consumer that pages through an API or a catalogue needs one place that answers "do I have more pages, and what is the cursor for the next one" without mixing that state into its fetch code.

## Northstar Books examples

Northstar Books' catalogue browser pages through titles with an opaque server cursor. `Paginator` records each page as it arrives and reports whether another request is needed, so the storefront never holds loose cursor variables.

## Install

```sh
pnpm add @studnicky/paginator
```

## Usage

Create a paginator with `Paginator.create<TPage, TCursor>()`, record each fetched page through `next(page, cursor)`, and read `pages` and `hasNext()`. The state is exhausted when `next()` receives `{ 'exhausted': true }`.

## Public entrypoints

| Import path                       | Use it when                                                        |
| --------------------------------- | ------------------------------------------------------------------ |
| `@studnicky/paginator/node`       | A Node server or worker tracks paginated state.                    |
| `@studnicky/paginator/browser`    | A browser bundle tracks paginated state.                           |
| `@studnicky/paginator/entities`   | A consumer needs the state and event schemas as contracts.         |
| `@studnicky/paginator/interfaces` | A consumer needs the cursor and state contracts for its own types. |

## Exports

| Symbol      | Purpose                                                                                           | Import path                 |
| ----------- | ------------------------------------------------------------------------------------------------- | --------------------------- |
| `Paginator` | Tracks received pages, the next cursor, and exhaustion. Constructed through `Paginator.create()`. | `@studnicky/paginator/node` |

## Entities

`PaginatorIdleStateEntity`, `PaginatorHasMoreStateEntity`, `PaginatorExhaustedStateEntity`, `PaginatorAvailableCursorEntity`, `PaginatorExhaustedCursorEntity`, `PaginatorPageReceivedEventEntity`, and `PaginatorResetEventEntity` are schema-derived contracts available from `@studnicky/paginator/entities`.

<RunnableExample src="packages/paginator/examples/observedPaginator" title="Observed pagination — transition trace" />
