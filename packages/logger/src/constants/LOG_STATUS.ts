import type { LogStatusEntity } from '../entities/LogStatusEntity.js';

/**
 * Runtime constants for LogStatus values.
 * Use for comparisons and switch statements.
 */
export const LOG_STATUS = {
  // Success
  'CACHED': 'cached',
  // Lifecycle
  'COMPLETE': 'complete',
  // Failure
  'FAILED': 'failed',
  'IN_PROGRESS': 'in_progress',
  'INVALID': 'invalid',
  'NOT_FOUND': 'not_found',
  'PARTIAL': 'partial',
  'PENDING': 'pending',
  'RATE_LIMITED': 'rate_limited',
  // Retry
  'RETRY_EXHAUSTED': 'retry_exhausted',
  'RETRYING': 'retrying',
  'SKIPPED': 'skipped',
  'SUCCESS': 'success',
  'TIMEOUT': 'timeout',
  'UNAUTHORIZED': 'unauthorized',
  'UNAVAILABLE': 'unavailable'
} as const satisfies Record<string, LogStatusEntity.Type>;

/**
 * Status categories for filtering.
 */
export const STATUS_CATEGORIES = {
  /** Failure states: failed, timeout, invalid, not_found, unauthorized, rate_limited, unavailable */
  'FAILURE': [
    'failed',
    'timeout',
    'invalid',
    'not_found',
    'unauthorized',
    'rate_limited',
    'unavailable'
  ] as const,

  /** Lifecycle states: pending, in_progress, complete */
  'LIFECYCLE': [
    'pending',
    'in_progress',
    'complete'
  ] as const,

  /** Retry states: retrying, retry_exhausted */
  'RETRY': [
    'retrying',
    'retry_exhausted'
  ] as const,

  /** Success states: success, partial, cached, skipped */
  'SUCCESS': [
    'success',
    'partial',
    'cached',
    'skipped'
  ] as const
} as const satisfies Record<string, readonly LogStatusEntity.Type[]>;
