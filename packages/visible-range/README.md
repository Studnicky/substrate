# @studnicky/visible-range

> Pure index/offset arithmetic for computing the visible item range of a virtualized list

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/visible-range)

Given a scroll offset, a viewport size, an item-size accessor (fixed or per-index), and an overscan count, `VisibleRange` computes the inclusive `[start, end]` index range of items currently visible. It mirrors TanStack Virtual's core range math without any of TanStack Virtual's DOM/React binding.

**Zero DOM dependency.** This package never references `window`, `document`, or `ResizeObserver`. The caller wires actual scroll-event listeners and `ResizeObserver` themselves, and feeds the results in via `setScrollOffset()` / `setViewportSize()`.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/visible-range
```

## Usage

### Fixed-size mode

Every item shares one size — O(1) division-based range math.

```typescript
import { VisibleRange } from '@studnicky/visible-range';

const rows = VisibleRange.create({ count: 10_000, itemSize: 40, overscan: 2 });

// Wire this to your own scroll listener / ResizeObserver.
rows.setViewportSize(400);
rows.setScrollOffset(2000);

const { start, end } = rows.getRange();
// Render items [start, end] inclusive.
```

### Variable-size mode

A per-index size estimator drives a binary-searched cumulative-offset array. `measureItem()` corrects the estimate once a real size is known (e.g. after a row renders and reports its measured height).

```typescript
import { VisibleRange } from '@studnicky/visible-range';

const list = VisibleRange.create({
  count: 500,
  estimateSize: () => 32,
  overscan: 1
});

list.setViewportSize(200);
list.setScrollOffset(320);

const initial = list.getRange();

// A rendered row reports its actual height — corrects future range math.
list.measureItem(0, 48);

const corrected = list.getRange();
```

## API Reference

### `VisibleRange.create(config): VisibleRange`

`config` fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | `number` | yes | Total item count. |
| `itemSize` | `number` | one of `itemSize` / `estimateSize` | Fixed size shared by every item. Enables O(1) range math. |
| `estimateSize` | `(index: number) => number` | one of `itemSize` / `estimateSize` | Per-index size estimator. Enables binary-search range math and `measureItem()` corrections. |
| `overscan` | `number` | no (default `0`) | Extra items included on either side of the visible range. |

Supplying neither `itemSize` nor `estimateSize`, or supplying both, throws a `VisibleRangeError`.

`VisibleRangeConfigDataEntity` owns the serializable count, fixed-size, and overscan fields. `VisibleRangeResolvedConfigEntity` owns the serializable mode and normalized configuration state retained alongside the variable-size estimator contract.

### Instance methods

| Method | Description |
|---|---|
| `setScrollOffset(offset: number): void` | Sets the current scroll offset. |
| `setViewportSize(size: number): void` | Sets the current viewport size. |
| `measureItem(index: number, size: number): void` | Records an actual measured size for an index, correcting future range calculations. **Variable mode only** — in fixed-size mode this is a documented no-op, since every item shares one size by construction. |
| `getRange(): { start: number; end: number }` | The inclusive `[start, end]` index range of items currently visible. |

## Extending

Subclass `VisibleRange` and override `onRangeChange` to add telemetry without coupling the base class to a metrics library. The hook fires from `getRange()` only when the computed range differs from the previously computed range — the very first call always fires.

```typescript
import type { VisibleRangeEntity } from '@studnicky/visible-range';

import { VisibleRange } from '@studnicky/visible-range';

class InstrumentedVisibleRange extends VisibleRange {
  protected override onRangeChange(range: VisibleRangeEntity.Type): void {
    metrics.gauge('visible-range.start', range.start);
    metrics.gauge('visible-range.end', range.end);
  }
}

const range = InstrumentedVisibleRange.create({ count: 1000, itemSize: 40 });
```

Available hooks: `onRangeChange`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/visible-range

## License

MIT
