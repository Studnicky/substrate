---
title: '@studnicky/visible-range'
description: Pure index/offset arithmetic for computing the visible item range of a virtualized list.
---

# @studnicky/visible-range

> Pure index/offset arithmetic for computing the visible item range of a virtualized list.

Zero DOM dependency — this package never references `window`, `document`, or `ResizeObserver`. The caller wires actual scroll-event listeners and `ResizeObserver` themselves, and feeds the results in via `setScrollOffset()` / `setViewportSize()`.

## Install

```bash
pnpm add @studnicky/visible-range
```

## Usage

Given a scroll offset, a viewport size, an item-size accessor (fixed or per-index), and an overscan count, `VisibleRange` computes the inclusive `[start, end]` index range of items currently visible. Fixed mode (`itemSize`) shares one size across every item; variable mode (`estimateSize`) uses a per-index estimator corrected over time via `measureItem()`:

<<< ../../packages/visible-range/examples/observedVisibleRange.ts#usage

## Builder

`VisibleRange.builder()` returns a `VisibleRangeBuilder` — a fluent alternative to `VisibleRange.create()` for callers assembling config incrementally:

<!-- inline-ts-ok: conceptual builder-chain snippet, not backed by a runnable example file -->
```typescript
import { VisibleRange } from '@studnicky/visible-range';

const range = VisibleRange.builder()
  .withCount(1000)
  .withItemSize(40)
  .withOverscan(2)
  .build();
```

| Method | Description |
|------|--------------|
| `withCount(value)` | Total item count. |
| `withItemSize(value)` | Fixed size shared by every item. Mutually exclusive with `withEstimateSize()`. |
| `withEstimateSize(value)` | Per-index size estimator. Mutually exclusive with `withItemSize()`. |
| `withOverscan(value)` | Extra items included on either side of the visible range. |
| `build(): VisibleRange` | Constructs the `VisibleRange` instance. |

`build()` applies the same validation as `VisibleRange.create()` — supplying neither `withItemSize()`/`withEstimateSize()`, or supplying both, throws a `VisibleRangeError`.

## Errors

`VisibleRangeError` (from `@studnicky/errors`' `BaseError`) is thrown when a config is invalid or ambiguous, both via `VisibleRange.create()` and `VisibleRangeBuilder.build()`:

<!-- inline-ts-ok: conceptual error-handling snippet, not backed by a runnable example file -->
```typescript
import { VisibleRange, VisibleRangeError } from '@studnicky/visible-range';

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

Subclass `VisibleRange` and override the protected hook to inject trace logging, metrics, or side-effects at the exact stage where they are needed. Overrides must not throw or block.

| Hook | When it fires | Args |
|------|--------------|------|
| `onRangeChange(range)` | At the end of `getRange()`, only when the computed range differs from the previously computed range. The first call always fires. | `range: VisibleRangeType` |

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/visible-range)
