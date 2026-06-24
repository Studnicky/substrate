import type { STATUS_CATEGORIES } from '../constants/LOG_STATUS.js';

/**
 * Universal operation status values.
 *
 * Semantic outcomes that apply to ANY operation across the stack,
 * not HTTP-specific status codes.
 *
 * @example
 * ```typescript
 * import type { LogStatusType } from '@studnicky/logger/types';
 * import { LOG_STATUS } from '@studnicky/logger/constants';
 *
 * // Type-safe status
 * const status: LogStatusType = 'success';
 *
 * // Runtime constants
 * if (result.status === LOG_STATUS.FAILED) {
 *   handleError();
 * }
 * ```
 */
export type LogStatusType
  // Lifecycle: pending, in_progress, complete
  = | 'cached'
  | 'complete'
  | 'failed'
  // Success: success, partial, cached, skipped
  | 'in_progress'
  | 'invalid'
  | 'not_found'
  | 'partial'
  // Failure: failed, timeout, invalid, not_found, unauthorized, rate_limited, unavailable
  | 'pending'
  | 'rate_limited'
  | 'retry_exhausted'
  | 'retrying'
  | 'skipped'
  | 'success'
  | 'timeout'
  // Retry: retrying, retry_exhausted
  | 'unauthorized'
  | 'unavailable';

/**
 * Success status values.
 */
export type SuccessStatusType = typeof STATUS_CATEGORIES.SUCCESS[number];

/**
 * Failure status values.
 */
export type FailureStatusType = typeof STATUS_CATEGORIES.FAILURE[number];

/**
 * Lifecycle status values.
 */
export type LifecycleStatusType = typeof STATUS_CATEGORIES.LIFECYCLE[number];
