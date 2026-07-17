import { Guard } from '@studnicky/config';

import type { RequestStatsEntity } from '../../entities/RequestStatsEntity.js';

/**
 * Type guard for RequestStatsEntity.Type
 */
class RequestStatsGuard {
  /**
   * Validates RequestStatsEntity.Type structure and types.
   *
   * @param value - Value to check
   * @returns True if value is a valid RequestStatsEntity.Type
   *
   * @example
   * ```typescript
   * const stats = retry.getStats();
   * if (RequestStatsGuard.isRequestStats(stats)) {
   *   console.log(`Success rate: ${stats.successfulRequests / stats.totalRequests}`);
   * }
   * ```
   */
  public static isRequestStats(value: unknown): value is RequestStatsEntity.Type {
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
