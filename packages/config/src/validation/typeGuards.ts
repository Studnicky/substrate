/**
 * Primitive type guards for configuration validation.
 *
 * Provides type-safe validation for common value types
 * used in configuration and runtime validation.
 *
 * Subclass and `static override` methods to extend or specialize guard logic.
 */

export class TypeGuards {
  public static isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  public static isFunction(value: unknown): value is (...args: unknown[]) => unknown {
    return typeof value === 'function';
  }

  /**
   * Type guard for non-negative integers (>= 0).
   */
  public static isNonNegativeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
  }

  /**
   * Type guard for positive integers (> 0).
   */
  public static isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
  }
}
