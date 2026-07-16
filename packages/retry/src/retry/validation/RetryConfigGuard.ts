import { Guard } from '@studnicky/config';

import type { RetryConfigInterface } from '../../interfaces/RetryConfigInterface.js';

import { Retry } from '../Retry.js';

/**
 * Type guard for RetryConfigInterface.
 */
class RetryConfigGuard {
  /**
   * Validates both the JSON-serializable subset (maxRetries via schema) and the
   * runtime members (errorClassifier) by delegating to Retry.create,
   * which runs the full validation pipeline.
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
      Retry.create(value);

      return true;
    } catch {
      return false;
    }
  }
}

export { RetryConfigGuard };
