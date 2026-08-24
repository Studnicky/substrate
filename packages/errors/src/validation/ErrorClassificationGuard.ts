import { ErrorClassificationEntity } from '../entities/ErrorClassificationEntity.js';

/**
 * Type guard for ErrorClassificationEntity.Type
 */
class ErrorClassificationGuard {
  /**
   * Validates ErrorClassificationEntity.Type structure and types, delegating to the entity's own
   * `validate` so this check and the schema it mirrors can't drift apart.
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
  public static isErrorClassification(value: Parameters<typeof ErrorClassificationEntity.validate>[0]): value is ErrorClassificationEntity.Type {
    const result = ErrorClassificationEntity.validate(value);
    return result;
  }
}

export { ErrorClassificationGuard };
