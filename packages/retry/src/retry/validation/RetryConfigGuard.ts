import { Guard } from '@studnicky/config';

import type { RetryConfigInterface } from '../../interfaces/RetryConfigInterface.js';

import { validateRetryConfig } from '../config/validateRetryConfig.js';

/**
 * Type guard for RetryConfigInterface.
 */
class RetryConfigGuard {
  /**
   * Validates both the JSON-serializable subset (maxRetries via schema) and the
   * runtime members (errorClassifier) by delegating to the shared structural
   * validator, without constructing a Retry instance or a DefaultHttpErrorClassifier.
   *
   * @param value - Value to check
   * @returns True if value is a valid RetryConfigInterface
   *
   * @example
   * ```typescript
   * if (RetryConfigGuard.isRetryConfig(config)) {
   *   const retry = Retry.create(config);
   * }
   * ```
   */
  public static isRetryConfig(value: unknown): value is RetryConfigInterface {
    if (!Guard.isObject(value)) {
      return false;
    }

    try {
      validateRetryConfig.validate(value);

      return true;
    } catch {
      return false;
    }
  }
}

export { RetryConfigGuard };
