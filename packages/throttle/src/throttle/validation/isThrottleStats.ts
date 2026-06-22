import { TypeGuards } from '@studnicky/config';

import type { ThrottleStatsType } from '../../interfaces/ThrottleStatsType.js';

/**
 * Type guard that checks if value is a valid ThrottleStatsType
 *
 * Validates that the value contains all required stats fields with correct types.
 *
 * @param value - Value to check
 * @returns True if value is a valid ThrottleStatsType
 */
export function isThrottleStats(value: unknown): value is ThrottleStatsType {
  if (!TypeGuards.isObject(value)) {
    return false;
  }

  if (!TypeGuards.isNonNegativeInteger(value.activeCount)) {
    return false;
  }

  if (!TypeGuards.isNonNegativeInteger(value.queuedCount)) {
    return false;
  }

  if (!TypeGuards.isNonNegativeInteger(value.totalExecuted)) {
    return false;
  }

  if (!TypeGuards.isPositiveInteger(value.concurrencyLimit)) {
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
