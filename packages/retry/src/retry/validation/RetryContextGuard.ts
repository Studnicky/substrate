import { Guard } from '@studnicky/config';
import { ErrorClassificationGuard } from '@studnicky/errors';

import type { RetryContextType } from '../../types/RetryContextType.js';

import { EMPTY_LENGTH } from '../../constants/index.js';
import { RequestStatsGuard } from './RequestStatsGuard.js';

/**
 * Type guard for RetryContextType
 */
class RetryContextGuard {
  /**
   * @param value - Value to check
   * @returns True if value is a valid RetryContextType
   */
  public static isRetryContext(value: unknown): value is RetryContextType {
    if (!Guard.isObject(value)) {
      return false;
    }

    if (!Guard.isNonNegativeInteger(value.attemptNumber)) {
      return false;
    }

    if (!ErrorClassificationGuard.isErrorClassification(value.classification)) {
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

    if (!RequestStatsGuard.isRequestStats(value.stats)) {
      return false;
    }

    if (!Guard.isObject(value.state)) {
      return false;
    }

    return true;
  }
}

export { RetryContextGuard };
