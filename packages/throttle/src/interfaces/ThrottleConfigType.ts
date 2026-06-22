import type { AdaptiveConfigInputType } from '../types/AdaptiveConfigInputType.js';

/**
 * Configuration options for the Throttle class.
 *
 * Controls concurrency limits and optional adaptive behavior that adjusts
 * the concurrency limit based on observed latencies.
 *
 * @example Basic configuration
 * ```typescript
 * const config: ThrottleConfigType = {
 *   concurrencyLimit: 5
 * };
 * ```
 *
 * @example With adaptive concurrency
 * ```typescript
 * const config: ThrottleConfigType = {
 *   concurrencyLimit: 10,
 *   adaptive: {
 *     enabled: true,
 *     targetLatencyMs: 100,
 *     minConcurrency: 1,
 *     maxConcurrency: 20
 *   }
 * };
 * ```
 */
export type ThrottleConfigType = {
  /**
   * Adaptive concurrency configuration
   * When enabled, concurrency limit adjusts automatically based on observed latencies.
   * Only `enabled` and `targetLatencyMs` (when enabled=true) are required - other
   * properties have defaults applied during validation.
   */
  'adaptive'?: AdaptiveConfigInputType;

  /**
   * Maximum number of concurrent operations
   * @default 10
   */
  'concurrencyLimit'?: number;
};
