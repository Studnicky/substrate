import { Guard } from '@studnicky/types';

import type { ErrorClassificationType } from '../types/ErrorClassificationType.js';

/**
 * Type guard for ErrorClassificationType
 */
class ErrorClassificationGuard {
  /**
   * Validates ErrorClassificationType structure and types.
   *
   * @param value - Value to check
   * @returns True if value is a valid ErrorClassificationType
   *
   * @example
   * ```typescript
   * if (ErrorClassificationGuard.isErrorClassification(result)) {
   *   if (result.retryable) {
   *     console.log('Error can be retried:', result.reason);
   *   }
   * }
   * ```
   */
  public static isErrorClassification(value: unknown): value is ErrorClassificationType {
    if (!Guard.isObject(value)) {
      return false;
    }

    if (typeof value.retryable !== 'boolean') {
      return false;
    }

    if (value.reason !== undefined && typeof value.reason !== 'string') {
      return false;
    }

    return true;
  }
}

export { ErrorClassificationGuard };
