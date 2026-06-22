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

import { STATUS_CATEGORIES } from '../constants/LOG_STATUS.js';

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

/**
 * Type predicate that checks if a status indicates a successful outcome.
 *
 * @param status - The status to check
 * @returns True if the status is a success status, with type narrowing
 */
export function isSuccessStatus(status: LogStatusType): status is SuccessStatusType {
  if (typeof status !== 'string') {
    return false;
  }

  return (STATUS_CATEGORIES.SUCCESS as readonly string[]).includes(status);
}

/**
 * Type predicate that checks if a status indicates a failure outcome.
 *
 * @param status - The status to check
 * @returns True if the status is a failure status, with type narrowing
 */
export function isFailureStatus(status: LogStatusType): status is FailureStatusType {
  if (typeof status !== 'string') {
    return false;
  }

  return (STATUS_CATEGORIES.FAILURE as readonly string[]).includes(status);
}

/**
 * Type predicate that checks if a status indicates a lifecycle state.
 *
 * @param status - The status to check
 * @returns True if the status is a lifecycle status, with type narrowing
 */
export function isLifecycleStatus(status: LogStatusType): status is LifecycleStatusType {
  if (typeof status !== 'string') {
    return false;
  }

  return (STATUS_CATEGORIES.LIFECYCLE as readonly string[]).includes(status);
}
