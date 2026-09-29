---
title: '@studnicky/visible-range'
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

Given a scroll offset, a viewport size, an item-size accessor (fixed or per-index), and an overscan count, `VisibleRange` computes the inclusive `[start, end]` index range of items currently visible. Fixed mode (`itemSize`) shares one size across every item; variable mode (`estimateSize`) uses a per-index estimator corrected over time via `measureItem()`:

<<< ../../packages/visible-range/examples/observedVisibleRange.ts#usage

## Try it

<RunnableExample src="packages/visible-range/examples/observedVisibleRange" title="Fixed and variable-size visible-range computation" />

The output shows fixed-mode `onRangeChange` firing only when the computed range actually moves (not for an identical re-set scroll offset), and variable-mode range estimates shifting once `measureItem()` corrects the per-index size estimate with real measurements.

## Construction

`VisibleRange.create({ count, itemSize, overscan? })` selects fixed-size arithmetic — `itemSize` is schema-validated config, the first argument. `VisibleRange.create({ count, overscan? }, { estimateSize })` selects variable-size arithmetic — `estimateSize` is a typed collaborator, the second argument. Exactly one sizing strategy is required.

## Errors

`VisibleRangeError` is the root-exported package error thrown when `VisibleRange.create()` receives invalid or ambiguous config:

<!-- inline-ts-ok: conceptual error-handling snippet, not backed by a runnable example file -->
```typescript
import { VisibleRange, VisibleRangeError } from '@studnicky/visible-range/node';

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

| Hook | When it fires | Args |
|------|--------------|------|
| `onRangeChange(range)` | At the end of `getRange()`, only when the computed range differs from the preceding range. The first call always fires. | `range: VisibleRangeEntity.Type` |

The base class never calls any logger or metrics library. All hooks are no-ops by default.

Import `VisibleRange` and `VisibleRangeError` from `@studnicky/visible-range/node`, `VisibleRangeEntity` from `@studnicky/visible-range/entities`, and `VisibleRangeCollaboratorsInterface` from `@studnicky/visible-range/interfaces`.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/visible-range)

## Entities

`@studnicky/visible-range/entities` exports every schema namespace in `src/entities`.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import { VisibleRangeEntity } from '@studnicky/visible-range/entities';
```

## Interfaces

`@studnicky/visible-range/interfaces` exports the typed `estimateSize` collaborator `VisibleRange.create` accepts alongside schema-validated config.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import type { VisibleRangeCollaboratorsInterface } from '@studnicky/visible-range/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `VisibleRange` | Provides visible range functionality. | `@studnicky/visible-range/node` |
| `VisibleRangeError` | Represents visible range failures. | `@studnicky/visible-range/node` |
