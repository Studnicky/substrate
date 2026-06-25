/**
 * Batch Concurrent Execution
 *
 * Processes items in batches with controlled concurrency using async generators.
 * Yields results as each batch completes, enabling incremental processing.
 */

import type { BatchHooksInterface } from '../interfaces/BatchHooksInterface.js';
import type { BatchOptionsInterface } from '../interfaces/BatchOptionsInterface.js';
import type { BatchStatsType } from '../interfaces/BatchStatsType.js';

import {
  DEFAULT_BATCH_MAX_CONCURRENT, EMPTY_LENGTH, FIRST_ARRAY_INDEX
} from '../constants/index.js';
import { BatchError } from '../errors/index.js';

/**
 * Internal async generator implementations for batch concurrent processing.
 */
class BatchConcurrentRunner {
  /**
   * Async generator that processes items in batches with controlled concurrency.
   *
   * Yields batch results as each batch completes, enabling streaming/incremental
   * processing and backpressure handling. Results within each batch maintain
   * their relative order.
   *
   * @typeParam T - Type of input items
   * @typeParam TResult - Type of operation results
   * @param items - Array of items to process
   * @param operation - Async function to apply to each item
   * @param concurrency - Maximum concurrent operations per batch, or options object
   * @yields Array of results for each completed batch
   *
   * @example
   * ```typescript
   * const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];
   *
   * // Process batches incrementally
   * for await (const batchResults of batchConcurrent.process(urls, fetchData, 2)) {
   *   console.log('Batch complete:', batchResults);
   * }
   *
   * // Or with options object
   * for await (const batchResults of batchConcurrent.process(urls, fetchData, { maxConcurrent: 2 })) {
   *   console.log('Batch complete:', batchResults);
   * }
   *
   * // With observability hooks
   * for await (const batchResults of batchConcurrent.process(urls, fetchData, {
   *   hooks: {
   *     onBatchStart(total) { console.log('starting', total, 'items'); },
   *     onItemError(index, error) { console.error('item', index, 'failed:', error); },
   *     onBatchComplete(stats) { console.log('done', stats); },
   *   },
   *   maxConcurrent: 2,
   * })) {
   *   console.log('Batch complete:', batchResults);
   * }
   * ```
   */
  static async *process<T, TResult>(
    items: readonly T[],
    operation: (item: T) => Promise<TResult>,
    concurrency?: number | BatchOptionsInterface<TResult>
  ): AsyncGenerator<TResult[], void, unknown> {
    if (items.length === EMPTY_LENGTH) {
      return;
    }

    const maxConcurrent = typeof concurrency === 'number'
      ? concurrency
      : (concurrency?.maxConcurrent ?? DEFAULT_BATCH_MAX_CONCURRENT);

    const hooks: BatchHooksInterface<TResult> | undefined = typeof concurrency === 'object'
      ? concurrency.hooks
      : undefined;

    if (maxConcurrent <= 0 || !Number.isInteger(maxConcurrent)) {
      throw new BatchError('maxConcurrent must be a positive integer');
    }

    const itemsLen = items.length;
    let succeeded = 0;
    let failed = 0;

    hooks?.onBatchStart?.(itemsLen);

    for (let i = FIRST_ARRAY_INDEX; i < itemsLen; i += maxConcurrent) {
      const batch = items.slice(i, i + maxConcurrent);

      if (batch.length === maxConcurrent) {
        hooks?.onConcurrencySaturated?.();
      }

      const batchOffset = i;
      const batchResults = await Promise.all(
        batch.map(async (item, batchIdx) => {
          const globalIndex = batchOffset + batchIdx;
          hooks?.onItemStart?.(globalIndex);
          try {
            const result = await operation(item);
            succeeded++;
            hooks?.onItemSuccess?.(globalIndex, result);
            hooks?.onItemSettled?.(globalIndex);
            return result;
          } catch (error) {
            failed++;
            hooks?.onItemError?.(globalIndex, error);
            hooks?.onItemSettled?.(globalIndex);
            throw error;
          }
        })
      );

      yield batchResults;
    }

    const stats: BatchStatsType = { 'failed': failed, 'succeeded': succeeded, 'total': itemsLen };
    hooks?.onBatchComplete?.(stats);
  }

  /**
   * Async generator that processes items in batches with partial-failure support.
   *
   * Uses Promise.allSettled internally, allowing individual operations to fail
   * without stopping the batch or subsequent batches. Yields PromiseSettledResult
   * arrays that include both fulfilled values and rejection reasons.
   *
   * @typeParam T - Type of input items
   * @typeParam TResult - Type of operation results
   * @param items - Array of items to process
   * @param operation - Async function to apply to each item
   * @param concurrency - Maximum concurrent operations per batch, or options object
   * @yields Array of PromiseSettledResult for each completed batch
   *
   * @example
   * ```typescript
   * const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];
   *
   * for await (const batchResults of batchConcurrent.processSettled(urls, fetchData, 2)) {
   *   for (const result of batchResults) {
   *     if (result.status === 'fulfilled') {
   *       console.log('Success:', result.value);
   *     } else {
   *       console.log('Failed:', result.reason);
   *     }
   *   }
   * }
   *
   * // With observability hooks
   * for await (const batchResults of batchConcurrent.processSettled(urls, fetchData, {
   *   hooks: {
   *     onItemError(index, error) { console.warn('item', index, 'rejected:', error); },
   *     onBatchComplete(stats) { console.log('done', stats); },
   *   },
   *   maxConcurrent: 2,
   * })) { ... }
   * ```
   */
  static async *processSettled<T, TResult>(
    items: readonly T[],
    operation: (item: T) => Promise<TResult>,
    concurrency?: number | BatchOptionsInterface<TResult>
  ): AsyncGenerator<PromiseSettledResult<TResult>[], void, unknown> {
    if (items.length === EMPTY_LENGTH) {
      return;
    }

    const maxConcurrent = typeof concurrency === 'number'
      ? concurrency
      : (concurrency?.maxConcurrent ?? DEFAULT_BATCH_MAX_CONCURRENT);

    const hooks: BatchHooksInterface<TResult> | undefined = typeof concurrency === 'object'
      ? concurrency.hooks
      : undefined;

    const itemsLen = items.length;
    let succeeded = 0;
    let failed = 0;

    hooks?.onBatchStart?.(itemsLen);

    for (let i = FIRST_ARRAY_INDEX; i < itemsLen; i += maxConcurrent) {
      const batch = items.slice(i, i + maxConcurrent);

      if (batch.length === maxConcurrent) {
        hooks?.onConcurrencySaturated?.();
      }

      const batchOffset = i;
      const batchResults = await Promise.allSettled(
        batch.map(async (item, batchIdx) => {
          const globalIndex = batchOffset + batchIdx;
          hooks?.onItemStart?.(globalIndex);
          try {
            const result = await operation(item);
            succeeded++;
            hooks?.onItemSuccess?.(globalIndex, result);
            hooks?.onItemSettled?.(globalIndex);
            return result;
          } catch (error) {
            failed++;
            hooks?.onItemError?.(globalIndex, error);
            hooks?.onItemSettled?.(globalIndex);
            throw error;
          }
        })
      );

      yield batchResults;
    }

    const stats: BatchStatsType = { 'failed': failed, 'succeeded': succeeded, 'total': itemsLen };
    hooks?.onBatchComplete?.(stats);
  }
}

/**
 * Batch concurrent processing utilities
 */
const batchConcurrent = {
  'process': BatchConcurrentRunner.process,
  'processSettled': BatchConcurrentRunner.processSettled
};

export { batchConcurrent };
