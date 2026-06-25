import type { BatchHooksInterface } from './BatchHooksInterface.js';

/**
 * Options object accepted by batchConcurrent.process and batchConcurrent.processSettled.
 *
 * @typeParam TResult - Type of operation results; used to type hook callbacks.
 */
export interface BatchOptionsInterface<TResult = unknown> {
  /**
   * Optional lifecycle callbacks invoked at each observable stage of the run.
   * All callbacks are optional. Omitting `hooks` entirely is fully non-breaking.
   */
  'hooks'?: BatchHooksInterface<TResult>;
  /** Maximum number of concurrent operations per batch. Defaults to DEFAULT_BATCH_MAX_CONCURRENT. */
  'maxConcurrent'?: number;
}
