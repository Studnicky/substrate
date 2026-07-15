import { Guard } from '@studnicky/config';

import type { RequestStatsType } from '../../types/RequestStatsType.js';

/**
 * Type guard for RequestStatsType
 */
class RequestStatsGuard {
  /**
   * Validates RequestStatsType structure and types.
   *
   * @param value - Value to check
   * @returns True if value is a valid RequestStatsType
   *
   * @example
   * ```typescript
   * const stats = retry.getStats();
   * if (RequestStatsGuard.isRequestStats(stats)) {
   *   console.log(`Success rate: ${stats.successfulRequests / stats.totalRequests}`);
   * }
   * ```
   */
  public static isRequestStats(value: unknown): value is RequestStatsType {
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
}

export { RequestStatsGuard };
