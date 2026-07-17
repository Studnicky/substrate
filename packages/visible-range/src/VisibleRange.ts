/**
 * Pure index/offset arithmetic for computing the visible item range of a
 * virtualized/windowed list — no DOM, no scroll listeners, no
 * `ResizeObserver`. The caller wires actual scroll events and viewport
 * measurement and feeds the results in via `setScrollOffset()` /
 * `setViewportSize()`.
 */

import { HookInvoker } from '@studnicky/errors';

import type { VisibleRangeEntity } from './entities/VisibleRangeEntity.js';
import type { VisibleRangeConfigInterface } from './interfaces/VisibleRangeConfigInterface.js';

import { DEFAULT_OVERSCAN, INITIAL_OFFSET } from './constants/index.js';
import { VisibleRangeError } from './errors/index.js';
import { VisibleRangeBuilder } from './VisibleRangeBuilder.js';

type ResolvedConfigType =
  | { readonly 'count': number; readonly 'itemSize': number; readonly 'mode': 'fixed'; readonly 'overscan': number }
  | { readonly 'count': number; readonly 'estimateSize': (index: number) => number; readonly 'mode': 'variable'; readonly 'overscan': number };

/**
 * Computes the inclusive `[start, end]` index range of items currently
 * visible given a scroll offset, viewport size, and overscan.
 *
 * Two mutually exclusive modes, selected at construction:
 * - **Fixed** (`itemSize`) — every item shares one size; O(1)
 *   division-based range math.
 * - **Variable** (`estimateSize`) — a per-index size estimator; a
 *   cumulative-offset array is built lazily and binary-searched.
 *   `measureItem()` records corrected sizes for future range calculations.
 *
 * Subclasses may override `onRangeChange` to observe range recomputation
 * without coupling this class to any rendering/logging library.
 *
 * Fire points:
 * - `onRangeChange(range)` — end of `getRange()`, only when the computed
 *   range differs from the previously computed range.
 */
export class VisibleRange {
  static builder(): VisibleRangeBuilder {
    const result = VisibleRangeBuilder.create((config) => {
      const range = VisibleRange.create(config);
      return range;
    });
    return result;
  }

  static create(config: VisibleRangeConfigInterface): VisibleRange {
    const resolved = VisibleRange.#resolve(config);
    return new this(resolved);
  }

  static #resolve(config: VisibleRangeConfigInterface): ResolvedConfigType {
    const hasItemSize = config.itemSize !== undefined;
    const hasEstimateSize = config.estimateSize !== undefined;

    if (!hasItemSize && !hasEstimateSize) {
      throw new VisibleRangeError('one of `itemSize` or `estimateSize` must be supplied');
    }
    if (hasItemSize && hasEstimateSize) {
      throw new VisibleRangeError('`itemSize` and `estimateSize` are mutually exclusive — supply exactly one');
    }

    const overscan = config.overscan ?? DEFAULT_OVERSCAN;

    if (hasItemSize) {
      if (config.itemSize <= 0) {
        throw new VisibleRangeError(`\`itemSize\` must be a positive number, received ${config.itemSize}`);
      }
      return { 'count': config.count, 'itemSize': config.itemSize, 'mode': 'fixed', 'overscan': overscan };
    }
    return { 'count': config.count, 'estimateSize': config.estimateSize as (index: number) => number, 'mode': 'variable', 'overscan': overscan };
  }

  protected readonly hooks: HookInvoker = new HookInvoker();

  private readonly config: ResolvedConfigType;
  private scrollOffset = INITIAL_OFFSET;
  private viewportSize = INITIAL_OFFSET;
  private lastRange: VisibleRangeEntity.Type | undefined;

  /** Per-index measured-size corrections (variable mode only). */
  private readonly measuredSizes = new Map<number, number>();
  /** Cumulative offset array, index `i` = sum of sizes of items `[0, i)`. `null` when never built. Backed by a `Float64Array` for packed, unboxed numeric storage. */
  private offsets: Float64Array | null = null;
  /** Earliest index whose downstream cumulative offsets are stale. `null` when the array (if built) is fully up to date. */
  private dirtyFrom: number | null = null;

  protected constructor(config: ResolvedConfigType) {
    this.config = config;
  }

  /** Sets the current scroll offset (in the scroll axis). */
  setScrollOffset(offset: number): void {
    this.scrollOffset = offset;
  }

  /** Sets the current viewport size (in the scroll axis). */
  setViewportSize(size: number): void {
    this.viewportSize = size;
  }

  /**
   * Records an actual measured size for an index, correcting the estimate
   * used by future range calculations.
   *
   * Only meaningful in variable-size (`estimateSize`) mode. In fixed-size
   * (`itemSize`) mode this is a documented no-op — all items share one
   * size by construction, so there is nothing to correct.
   */
  measureItem(index: number, size: number): void {
    if (this.config.mode !== 'variable') {
      return;
    }
    if (this.measuredSizes.get(index) === size) {
      return;
    }
    this.measuredSizes.set(index, size);
    if (this.offsets !== null) {
      this.dirtyFrom = this.dirtyFrom === null ? index : Math.min(this.dirtyFrom, index);
    }
  }

  /**
   * The inclusive `[start, end]` index range of items currently visible,
   * given the current scroll offset, viewport size, and overscan.
   *
   * Fire point: `onRangeChange` fires after computing, only when the
   * result differs from the previously computed range.
   */
  getRange(): VisibleRangeEntity.Type {
    const range = this.config.mode === 'fixed' ? this.computeFixedRange(this.config) : this.computeVariableRange(this.config);

    if (this.lastRange?.start !== range.start || this.lastRange.end !== range.end) {
      this.lastRange = range;
      this.hooks.invoke('onRangeChange', () => { const result = this.onRangeChange(range); return result; });
    }
    return range;
  }

  private computeFixedRange(config: { readonly 'count': number; readonly 'itemSize': number; readonly 'overscan': number }): VisibleRangeEntity.Type {
    const { count, itemSize, overscan } = config;

    const start = Math.max(0, Math.floor(this.scrollOffset / itemSize) - overscan);
    const end = Math.min(count - 1, Math.ceil((this.scrollOffset + this.viewportSize) / itemSize) + overscan);

    return { 'end': end, 'start': start };
  }

  private computeVariableRange(config: { readonly 'count': number; readonly 'overscan': number }): VisibleRangeEntity.Type {
    const { count, overscan } = config;

    if (count === 0) {
      return { 'end': -1, 'start': 0 };
    }

    const offsets = this.ensureOffsets();
    const startIndex = this.indexAtOffset(offsets, this.scrollOffset);
    const endIndex = this.indexAtOffset(offsets, this.scrollOffset + this.viewportSize);

    const start = Math.max(0, startIndex - overscan);
    const end = Math.min(count - 1, endIndex + overscan);

    return { 'end': end, 'start': start };
  }

  /**
   * Builds (or incrementally repairs, or returns the cached) cumulative
   * offset array. `offsets[i]` is the start offset of item `i`;
   * `offsets[count]` is the total size.
   *
   * When a prior `measureItem()` invalidated only a suffix of the array
   * (tracked via `dirtyFrom`), only that suffix is recomputed — the
   * prefix `offsets[0..dirtyFrom]` is unaffected because item `i`'s
   * offset depends only on the sizes of items `[0, i)`.
   */
  private ensureOffsets(): Float64Array {
    if (this.config.mode !== 'variable') {
      throw new VisibleRangeError('ensureOffsets() called outside variable mode');
    }
    if (this.offsets !== null && this.dirtyFrom === null) {
      return this.offsets;
    }

    const { count, estimateSize } = this.config;
    const offsets = this.offsets ?? new Float64Array(count + 1);
    const startIndex = this.offsets === null ? 0 : this.dirtyFrom!;

    if (this.offsets === null) {
      offsets[0] = 0;
    }
    for (let i = startIndex; i < count; i++) {
      const size = this.measuredSizes.get(i) ?? estimateSize(i);
      offsets[i + 1] = offsets[i]! + size;
    }

    this.offsets = offsets;
    this.dirtyFrom = null;
    return offsets;
  }

  /** Binary search for the item index whose `[offsets[i], offsets[i+1])` span contains `target`. */
  private indexAtOffset(offsets: Float64Array, target: number): number {
    const count = this.config.count;

    let lo = 0;
    let hi = count;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (offsets[mid]! <= target) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    return Math.min(Math.max(0, lo - 1), count - 1);
  }

  /**
   * Called at the end of `getRange()`, only when the computed range
   * differs from the previously computed range. The very first call
   * always fires (there is no prior range to compare against).
   * No-op default — override to observe range changes.
   */
  protected onRangeChange(_range: VisibleRangeEntity.Type): void {
    // no-op
  }
}
