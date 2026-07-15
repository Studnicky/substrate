import { Guard } from '@studnicky/config';
import { isErrorClassification } from '@studnicky/errors';

import type { RetryContextType } from '../../types/RetryContextType.js';

import { EMPTY_LENGTH } from '../../constants/index.js';
import { isRequestStats } from './isRequestStats.js';

/**
 * Type guard for RetryContextType
 *
 * @param value - Value to check
 * @returns True if value is a valid RetryContextType
 */
export function isRetryContext(value: unknown): value is RetryContextType {
  if (!Guard.isObject(value)) {
    return false;
  }

  if (!Guard.isNonNegativeInteger(value.attemptNumber)) {
    return false;
  }

  if (!isErrorClassification(value.classification)) {
    return false;
  }

  if (typeof value.elapsedMs !== 'number' || value.elapsedMs < EMPTY_LENGTH) {
    return false;
  }

  if (!(value.error instanceof Error)) {
    return false;
  }

  if (!Guard.isNonNegativeInteger(value.maxRetries)) {
    return false;
  }

  if (!isRequestStats(value.stats)) {
    return false;
  }

  if (!Guard.isObject(value.state)) {
    return false;
  }

  return true;
}
