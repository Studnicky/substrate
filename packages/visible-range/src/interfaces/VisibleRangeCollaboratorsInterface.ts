/**
 * Typed collaborator `VisibleRange.create` accepts alongside schema-validated config.
 *
 * Exactly one of `itemSize` (in `config`, fixed mode) or `estimateSize` (here,
 * variable mode) must be supplied. Supplying neither, or both, is a config
 * error — a cross-field invariant no schema expresses, checked at construction.
 */
export interface VisibleRangeCollaboratorsInterface {
  /**
   * Per-index size estimator. Enables binary-search-based cumulative-offset
   * range math, and allows corrections via `measureItem()`. Mutually
   * exclusive with `itemSize`.
   */
  readonly 'estimateSize'?: (index: number) => number;
}
