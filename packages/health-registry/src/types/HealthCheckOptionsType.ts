/**
 * HealthCheckOptionsType — per-check options accepted by `HealthRegistry#register()`.
 */

export type HealthCheckOptionsType = {
  /**
   * Milliseconds allowed for this check to settle before it is treated as `'unhealthy'`
   * with timeout metadata. No default — a check with no `timeoutMs` runs unbounded.
   */
  'timeoutMs'?: number;
};
