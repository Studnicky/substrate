import { Guard } from '@studnicky/config';

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
  if (!Guard.isObject(value)) {
    return false;
  }

  return (
    Guard.isNonNegativeInteger(value.totalRequests)
    && Guard.isNonNegativeInteger(value.successfulRequests)
    && Guard.isNonNegativeInteger(value.failedRequests)
    && Guard.isNonNegativeInteger(value.totalRetries)
  );
}
