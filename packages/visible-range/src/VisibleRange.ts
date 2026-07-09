/**
 * Pure index/offset arithmetic for computing the visible item range of a
 * virtualized/windowed list — no DOM, no scroll listeners, no
 * `ResizeObserver`. The caller wires actual scroll events and viewport
 * measurement and feeds the results in via `setScrollOffset()` /
 * `setViewportSize()`.
 */

import type { VisibleRangeConfigInterface } from './types/VisibleRangeConfigInterface.js';
import type { VisibleRangeType } from './types/VisibleRangeType.js';

import { VisibleRangeError } from './errors/index.js';
import { VisibleRangeBuilder } from './VisibleRangeBuilder.js';

type ResolvedConfigType =
  | { readonly 'count': number; readonly 'itemSize': number; readonly 'mode': 'fixed'; readonly 'overscan': number }
  | { readonly 'count': number; readonly 'estimateSize': (index: number) => number; readonly 'mode': 'variable'; readonly 'overscan': number };

const DEFAULT_OVERSCAN = 0;
const INITIAL_OFFSET = 0;

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
      return { 'count': config.count, 'itemSize': config.itemSize, 'mode': 'fixed', 'overscan': overscan };
    }
    return { 'count': config.count, 'estimateSize': config.estimateSize as (index: number) => number, 'mode': 'variable', 'overscan': overscan };
  }

  private readonly config: ResolvedConfigType;
  private scrollOffset = INITIAL_OFFSET;
  private viewportSize = INITIAL_OFFSET;
  private lastRange: VisibleRangeType | undefined;

  /** Per-index measured-size corrections (variable mode only). */
  private readonly measuredSizes = new Map<number, number>();
  /** Cumulative offset array, index `i` = sum of sizes of items `[0, i)`. `null` when stale. */
  private offsets: number[] | null = null;

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
    this.offsets = null;
  }

  /**
   * The inclusive `[start, end]` index range of items currently visible,
   * given the current scroll offset, viewport size, and overscan.
   *
   * Fire point: `onRangeChange` fires after computing, only when the
   * result differs from the previously computed range.
   */
  getRange(): VisibleRangeType {
    const range = this.config.mode === 'fixed' ? this.computeFixedRange(this.config) : this.computeVariableRange(this.config);

    if (this.lastRange?.start !== range.start || this.lastRange.end !== range.end) {
      this.lastRange = range;
      this.onRangeChange(range);
    }
    return range;
  }

  private computeFixedRange(config: { readonly 'count': number; readonly 'itemSize': number; readonly 'overscan': number }): VisibleRangeType {
    const { count, itemSize, overscan } = config;

    const start = Math.max(0, Math.floor(this.scrollOffset / itemSize) - overscan);
    const end = Math.min(count - 1, Math.ceil((this.scrollOffset + this.viewportSize) / itemSize) + overscan);

    return { 'end': end, 'start': start };
  }

  private computeVariableRange(config: { readonly 'count': number; readonly 'overscan': number }): VisibleRangeType {
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

  /** Builds (or returns the cached) cumulative offset array. `offsets[i]` is the start offset of item `i`; `offsets[count]` is the total size. */
  private ensureOffsets(): number[] {
    if (this.offsets !== null) {
      return this.offsets;
    }
    if (this.config.mode !== 'variable') {
      throw new VisibleRangeError('ensureOffsets() called outside variable mode');
    }

    const { count, estimateSize } = this.config;
    const offsets = Array.from<number>({ 'length': count + 1 });

    offsets[0] = 0;
    for (let i = 0; i < count; i++) {
      const size = this.measuredSizes.get(i) ?? estimateSize(i);
      offsets[i + 1] = offsets[i]! + size;
    }

    this.offsets = offsets;
    return offsets;
  }

  /** Binary search for the item index whose `[offsets[i], offsets[i+1])` span contains `target`. */
  private indexAtOffset(offsets: number[], target: number): number {
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
  protected onRangeChange(_range: VisibleRangeType): void {
    // no-op
  }
}
