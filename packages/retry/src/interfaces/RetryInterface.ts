import type { RequestStatsEntity } from '../entities/RequestStatsEntity.js';

/**
 * Executes async operations with configurable retry logic, error classification, and backoff strategies.
 */
export interface RetryInterface {
  /**
   * Execute an async operation with retry logic
   */
  execute<T>(fn: () => Promise<T>): Promise<T>;

  /**
   * Get current request statistics
   */
  getStats(): RequestStatsEntity.Type;

  /**
   * Reset statistics counters
   */
  resetStats(): void;
}
