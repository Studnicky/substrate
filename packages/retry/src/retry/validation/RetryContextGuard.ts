import { ErrorClassificationGuard } from '@studnicky/errors';
import { Guard } from '@studnicky/types';

import type { RetryContextInterface } from '../../interfaces/RetryContextInterface.js';

import { EMPTY_LENGTH } from '../../constants/index.js';
import { RequestStatsEntity } from '../../entities/RequestStatsEntity.js';

/**
 * Type guard for RetryContextInterface
 */
class RetryContextGuard {
  /**
   * @param value - Value to check
   * @returns True if value is a valid RetryContextInterface
   */
  public static isRetryContext(value: unknown): value is RetryContextInterface {
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

    if (!RequestStatsEntity.validate(value.stats)) {
      return false;
    }

    if (!Guard.isObject(value.state)) {
      return false;
    }

    return true;
  }
}

export { RetryContextGuard };
