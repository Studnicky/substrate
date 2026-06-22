import type { AdaptiveConfigType } from './AdaptiveConfigType.js';

/**
 * Validated throttle configuration with required fields resolved
 */
export type ValidatedThrottleConfigType = {
  /**
   * Validated adaptive configuration (optional, undefined if not configured)
   */
  'adaptive'?: Required<AdaptiveConfigType>;

  /**
   * Maximum number of concurrent operations (required after validation)
   */
  'concurrencyLimit': number;
};
