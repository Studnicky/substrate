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

## Construction

`VisibleRange.create({ count, itemSize, overscan? })` selects fixed-size arithmetic. `VisibleRange.create({ count, estimateSize, overscan? })` selects variable-size arithmetic. Exactly one sizing strategy is required.

## Errors

`VisibleRangeError` is the root-exported package error thrown when `VisibleRange.create()` receives invalid or ambiguous config:

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

Subclass `VisibleRange` and override the protected hook to inject trace logging, metrics, or side-effects at the exact stage where they are needed. Hooks should stay fast and non-blocking; observer-hook failures are contained so range computation still wins.

| Hook | When it fires | Args |
|------|--------------|------|
| `onRangeChange(range)` | At the end of `getRange()`, only when the computed range differs from the preceding range. The first call always fires. | `range: VisibleRangeEntity.Type` |

The base class never calls any logger or metrics library. All hooks are no-ops by default.

Import `VisibleRange`, `VisibleRangeEntity`, `VisibleRangeConfigInterface`, and `VisibleRangeError` from `@studnicky/visible-range`. The package root is the only public code entrypoint.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/visible-range)
