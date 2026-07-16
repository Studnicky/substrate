import { Guard } from '@studnicky/config';

import type { ThrottleStatsEntity } from '../../entities/ThrottleStatsEntity.js';

class ThrottleStatsValidator {
  /**
   * Type guard that checks if value is a valid ThrottleStatsEntity.Type
   *
   * Validates that the value contains all required stats fields with correct types.
   *
   * @param value - Value to check
   * @returns True if value is a valid ThrottleStatsEntity.Type
   */
  public static isThrottleStats(value: unknown): value is ThrottleStatsEntity.Type {
    if (!Guard.isObject(value)) {
      return false;
    }

    if (!Guard.isNonNegativeInteger(value.activeCount)) {
      return false;
    }

    if (!Guard.isNonNegativeInteger(value.queuedCount)) {
      return false;
    }

    if (!Guard.isNonNegativeInteger(value.totalExecuted)) {
      return false;
    }

    if (!Guard.isPositiveInteger(value.concurrencyLimit)) {
      return false;
    }

    if (typeof value.isDraining !== 'boolean') {
      return false;
    }

    if (typeof value.isAborted !== 'boolean') {
      return false;
    }

    return true;
  }
}

export { ThrottleStatsValidator };
