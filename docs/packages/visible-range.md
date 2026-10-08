---
title: "@studnicky/visible-range"
description: Pure index/offset arithmetic for computing the visible item range of a virtualized list.
---

# @studnicky/visible-range

> Pure index/offset arithmetic for computing the visible item range of a virtualized list.

Zero DOM dependency — this package never references `window`, `document`, or `ResizeObserver`. The caller wires actual scroll-event listeners and `ResizeObserver` themselves, and feeds the results in via `setScrollOffset()` / `setViewportSize()`.

## Northstar Books catalogue viewport

Northstar's browser catalogue may contain thousands of titles, but the page only needs the cards inside and just beyond the reader's viewport. Feed browser measurements into `VisibleRange`, then render and fetch only the returned inclusive range. The package guarantees deterministic range arithmetic for fixed or measured variable item sizes; the browser integration remains responsible for observing scroll, viewport, and item measurements.

## Install

```bash
pnpm add @studnicky/visible-range
```

## Usage

Northstar's catalogue page could hold ten thousand titles, but the browser only ever needs to know which handful are actually in or near view right now. Feed `VisibleRange` a scroll offset, a viewport size, and either a fixed row height or a per-item size estimator, and it does the index arithmetic for you. The example below scrolls a 10,000-row catalogue at a fixed 40px row height — watching the computed range stay put when the scroll position hasn't actually changed — then switches to a 500-item list with an estimated height that `measureItem()` corrects once real measurements come in:

<<< ../../packages/visible-range/examples/observedVisibleRange.ts#usage

## Try it

Run it to watch `onRangeChange` fire exactly when the visible window actually moves — not on every scroll event — and see the variable-size estimate shift once measured heights replace the initial guess.

<RunnableExample src="packages/visible-range/examples/observedVisibleRange" title="Fixed and variable-size visible-range computation" />

The output shows fixed-mode `onRangeChange` firing only when the computed range actually moves (not for an identical re-set scroll offset), and variable-mode range estimates shifting once `measureItem()` corrects the per-index size estimate with real measurements.

## Construction

`VisibleRange.create({ count, itemSize, overscan? })` selects fixed-size arithmetic — `itemSize` is schema-validated config, the first argument. `VisibleRange.create({ count, overscan? }, { estimateSize })` selects variable-size arithmetic — `estimateSize` is a typed collaborator, the second argument. Exactly one sizing strategy is required.

## Errors

`VisibleRangeError` is the root-exported package error thrown when `VisibleRange.create()` receives invalid or ambiguous config:

<!-- inline-ts-ok: conceptual error-handling snippet, not backed by a runnable example file -->

```typescript
import { VisibleRange, VisibleRangeError } from "@studnicky/visible-range/node";

try {
  VisibleRange.create({ count: 100 }); // neither itemSize nor estimateSize supplied
} catch (error) {
  if (error instanceof VisibleRangeError) {
    console.error(error.code); // 'visibleRange.invalidConfig'
  }
}
```

It carries a fixed `code` of `'visibleRange.invalidConfig'` and `retryable: false`. It is thrown when:

- neither `itemSize` nor `estimateSize` is supplied,
- both `itemSize` and `estimateSize` are supplied.

## Observability hooks

Subclass `VisibleRange` and override the protected hook to inject trace logging, metrics, or side-effects at the exact stage where they are needed. Hooks should stay fast and non-blocking; observer-hook failures are contained so range computation still wins.

| Hook                   | When it fires                                                                                                           | Args                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `onRangeChange(range)` | At the end of `getRange()`, only when the computed range differs from the preceding range. The first call always fires. | `range: VisibleRangeEntity.Type` |

The base class never calls any logger or metrics library. All hooks are no-ops by default.

Import `VisibleRange` and `VisibleRangeError` from `@studnicky/visible-range/node`, `VisibleRangeEntity` from `@studnicky/visible-range/entities`, and `VisibleRangeCollaboratorsInterface` from `@studnicky/visible-range/interfaces`.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/visible-range)

## Entities

`@studnicky/visible-range/entities` exports every schema namespace in `src/entities`.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import { VisibleRangeEntity } from "@studnicky/visible-range/entities";
```

## Interfaces

`@studnicky/visible-range/interfaces` exports the typed `estimateSize` collaborator `VisibleRange.create` accepts alongside schema-validated config.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import type { VisibleRangeCollaboratorsInterface } from "@studnicky/visible-range/interfaces";
```

## What it is

`@studnicky/visible-range` is a pure visible-item range calculation primitive for fixed and measured variable-size lists. It receives measurements and returns inclusive indexes; it does not observe the DOM, fetch catalogue data, or render a list.

## What it is for

Northstar Books uses `VisibleRange` to determine which book cards a large reader catalogue needs to render and fetch around the viewport. The browser and Node entrypoints are runtime-specific alternatives around the same DOM-free arithmetic, while entities validate a resulting range and interfaces define the variable-size measurement collaborator.

## Northstar Books examples

- **Fixed and variable-size visible-range computation** solves the “render only the book cards a reader can see” problem. It computes a fixed-size range and refines a variable-size range with measurements, proving that Northstar can drive its own scroll observers and renderer with deterministic indexes.

## Public entrypoints

| Import path                           | Use it when                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `@studnicky/visible-range/node`       | Northstar computes deterministic catalogue ranges in Node-side rendering or tests.                  |
| `@studnicky/visible-range/browser`    | Northstar computes catalogue ranges in a browser while its own code supplies viewport measurements. |
| `@studnicky/visible-range/entities`   | Northstar validates a calculated visible-range value at a boundary.                                 |
| `@studnicky/visible-range/interfaces` | Northstar supplies the variable item-size estimator through a typed collaborator contract.          |

## Exports

| Symbol              | Purpose                               | Import path                     |
| ------------------- | ------------------------------------- | ------------------------------- |
| `VisibleRange`      | Provides visible range functionality. | `@studnicky/visible-range/node` |
| `VisibleRangeError` | Represents visible range failures.    | `@studnicky/visible-range/node` |
