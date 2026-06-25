import type { BatchStatsType } from './BatchStatsType.js';

/**
 * Lifecycle/observability hooks for batchConcurrent.
 *
 * All callbacks are invoked synchronously at each stage. They MUST NOT throw
 * or block — exceptions propagate out of the generator and will abort the run.
 *
 * @typeParam TResult - Type of operation results
 */
export interface BatchHooksInterface<TResult = unknown> {
  /**
   * Fired once after all items are processed.
   * @param stats - Aggregate counts for the completed run.
   */
  'onBatchComplete'?: (stats: BatchStatsType) => void;
  /**
   * Fired once before the first batch begins.
   * @param total - Total number of items in the run.
   */
  'onBatchStart'?: (total: number) => void;
  /**
   * Fired at the start of each batch when all concurrency slots are occupied
   * (i.e. the batch fills the full concurrency window — backpressure is active).
   */
  'onConcurrencySaturated'?: () => void;
  /**
   * Fired when an individual item rejects.
   * @param index - Zero-based index of the item.
   * @param error - The rejection reason.
   */
  'onItemError'?: (index: number, error: unknown) => void;
  /**
   * Fired after an item finishes, regardless of success or failure.
   * Fires after `onItemSuccess` or `onItemError`.
   * @param index - Zero-based index of the item.
   */
  'onItemSettled'?: (index: number) => void;
  /**
   * Fired when an individual item begins processing (before the async operation is awaited).
   * @param index - Zero-based index of the item in the original array.
   */
  'onItemStart'?: (index: number) => void;
  /**
   * Fired when an individual item resolves successfully.
   * @param index - Zero-based index of the item.
   * @param result - The resolved value.
   */
  'onItemSuccess'?: (index: number, result: TResult) => void;
}
