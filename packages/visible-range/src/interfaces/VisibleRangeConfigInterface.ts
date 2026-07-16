/**
 * Construction config for {@link VisibleRange}.
 *
 * Exactly one of `itemSize` (fixed mode) or `estimateSize` (variable mode)
 * must be supplied. Supplying neither, or both, is a config error.
 */
export interface VisibleRangeConfigInterface {
  /** Total number of items in the list. */
  readonly 'count': number;
  /**
   * Per-index size estimator. Enables binary-search-based cumulative-offset
   * range math, and allows corrections via `measureItem()`. Mutually
   * exclusive with `itemSize`.
   */
  readonly 'estimateSize'?: (index: number) => number;
  /**
   * Fixed size (in the scroll axis) shared by every item. Enables O(1)
   * division-based range math. Mutually exclusive with `estimateSize`.
   */
  readonly 'itemSize'?: number;
  /**
   * Extra items to include on either side of the visible range.
   * Defaults to `0`.
   */
  readonly 'overscan'?: number;
}
