/**
 * Validated configuration for adaptive concurrency adjustment
 *
 * This is the complete configuration with all required fields.
 * After validation, AdaptiveConfigInputType (user input) is transformed
 * into this type with defaults applied for any unspecified optional fields.
 *
 * @see AdaptiveConfigInputType for the user-provided input type with optional fields
 */
export type AdaptiveConfigType = {
  /**
   * Minimum milliseconds between adjustments to prevent thrashing
   */
  readonly 'adjustmentInterval': number;

  /**
   * Whether adaptive concurrency is enabled
   */
  readonly 'enabled': boolean;

  /**
   * Maximum concurrency limit (ceiling)
   */
  readonly 'maxConcurrency': number;

  /**
   * Minimum concurrency limit (floor)
   */
  readonly 'minConcurrency': number;

  /**
   * Number of samples in sliding window for percentile calculation
   */
  readonly 'sampleWindow': number;

  /**
   * Scale down when p95 latency exceeds targetLatencyMs * scaleDownThreshold
   */
  readonly 'scaleDownThreshold': number;

  /**
   * Scale up when p95 latency is below targetLatencyMs * scaleUpThreshold
   */
  readonly 'scaleUpThreshold': number;

  /**
   * Concurrency change per adjustment (step size)
   */
  readonly 'stepSize': number;

  /**
   * Target latency in milliseconds for p95
   */
  readonly 'targetLatencyMs': number;
};
