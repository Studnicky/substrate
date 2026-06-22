import { TypeGuards } from '@studnicky/config';

import type { RequestStatsType } from '../../interfaces/RequestStatsType.js';

/**
 * Type guard for RequestStatsType
 *
 * Validates RequestStatsType structure and types.
 *
 * @param value - Value to check
 * @returns True if value is a valid RequestStatsType
 *
 * @example
 * ```typescript
 * const stats = retry.getStats();
 * if (isRequestStats(stats)) {
 *   console.log(`Success rate: ${stats.successfulRequests / stats.totalRequests}`);
 * }
 * ```
 */
export function isRequestStats(value: unknown): value is RequestStatsType {
  if (!TypeGuards.isObject(value)) {
    return false;
  }

  return (
    TypeGuards.isNonNegativeInteger(value.totalRequests)
    && TypeGuards.isNonNegativeInteger(value.successfulRequests)
    && TypeGuards.isNonNegativeInteger(value.failedRequests)
    && TypeGuards.isNonNegativeInteger(value.totalRetries)
  );
}
