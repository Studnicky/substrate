import { Guard } from '@studnicky/types';

import type { ErrorClassificationEntity } from '../entities/ErrorClassificationEntity.js';

/**
 * Type guard for ErrorClassificationEntity.Type
 */
class ErrorClassificationGuard {
  /**
   * Validates ErrorClassificationEntity.Type structure and types.
   *
   * @param value - Value to check
   * @returns True if value is a valid ErrorClassificationEntity.Type
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
  public static isErrorClassification(value: unknown): value is ErrorClassificationEntity.Type {
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
