/** Custom backoff strategy for calculating retry delays. */
export interface BackoffStrategyInterface {
  (attemptNumber: number, baseDelayMs: number): number;
}
