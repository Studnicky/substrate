/**
 * Configuration validation utilities.
 *
 * Static assertion methods for validating configuration options.
 * All methods skip validation if value is undefined or null.
 * All methods throw (via `onValidationError`) on validation failure.
 *
 * Subclass and `static override onValidationError` to change the thrown error type.
 */
import { ConfigurationError } from '../errors/ConfigurationError.js';

export class ConfigValidation {
  /**
   * Extension seam — called by every assert method on validation failure.
   * Subclasses may `static override` to throw a domain-specific error instead.
   *
   * Fire-point: called with the constructed message string immediately before
   * the throw. `super.onValidationError` need not be called; the default throws
   * `ConfigurationError.create(message)`.
   */
  protected static onValidationError(message: string): never {
    throw ConfigurationError.create(message);
  }

  public static assertString(val: unknown, name: string): void {
    if (val === undefined || val === null) {
      return;
    }
    if (typeof val !== 'string') {
      this.onValidationError(`${name} must be a string`);
    }
  }

  public static assertNumber(val: unknown, name: string): void {
    if (val === undefined || val === null) {
      return;
    }
    if (typeof val !== 'number' || Number.isNaN(val)) {
      this.onValidationError(`${name} must be a number`);
    }
  }

  public static assertBoolean(val: unknown, name: string): void {
    if (val === undefined || val === null) {
      return;
    }
    if (typeof val !== 'boolean') {
      this.onValidationError(`${name} must be a boolean`);
    }
  }

  public static assertFunction(val: unknown, name: string): void {
    if (val === undefined || val === null) {
      return;
    }
    if (typeof val !== 'function') {
      this.onValidationError(`${name} must be a function`);
    }
  }

  /**
   * Assert number is an integer.
   * Assumes assertNumber has already passed.
   */
  public static assertInteger(val: unknown, name: string): void {
    if (val === undefined || val === null) {
      return;
    }
    if (!Number.isInteger(val)) {
      this.onValidationError(`${name} must be an integer`);
    }
  }

  /**
   * Assert number is finite (not Infinity or -Infinity).
   * Assumes assertNumber has already passed.
   */
  public static assertFinite(val: unknown, name: string): void {
    if (val === undefined || val === null) {
      return;
    }
    if (!Number.isFinite(val)) {
      this.onValidationError(`${name} must be finite`);
    }
  }

  /**
   * Assert number is non-negative (>= 0).
   * Assumes assertNumber has already passed.
   */
  public static assertNonNegative(val: unknown, name: string): void {
    if (val === undefined || val === null || typeof val !== 'number') {
      return;
    }
    if (val < 0) {
      this.onValidationError(`${name} must be non-negative`);
    }
  }

  /**
   * Assert number is positive (> 0).
   * Assumes assertNumber has already passed.
   */
  public static assertPositive(val: unknown, name: string): void {
    if (val === undefined || val === null || typeof val !== 'number') {
      return;
    }
    if (val <= 0) {
      this.onValidationError(`${name} must be positive`);
    }
  }

  /**
   * Assert number is at least min value.
   * Assumes assertNumber has already passed.
   */
  public static assertMin(val: unknown, min: number, name: string): void {
    if (val === undefined || val === null || typeof val !== 'number') {
      return;
    }
    if (val < min) {
      this.onValidationError(`${name} must be at least ${min}`);
    }
  }

  /**
   * Assert number is positive or Infinity.
   * Assumes assertNumber has already passed.
   */
  public static assertPositiveOrInfinity(val: unknown, name: string): void {
    if (val === undefined || val === null || typeof val !== 'number') {
      return;
    }
    if (val !== Infinity && val <= 0) {
      this.onValidationError(`${name} must be positive or Infinity`);
    }
  }

  public static assertHasMethod(val: unknown, method: string, name: string): void {
    if (val === undefined || val === null) {
      return;
    }
    if (typeof val !== 'object') {
      this.onValidationError(`${name} must be an object`);
      return;
    }
    try {
      if (!(method in val) || typeof (val as Record<string, unknown>)[method] !== 'function') {
        this.onValidationError(`${name} must have a ${method} method`);
      }
    } catch (error) {
      // Re-throw errors produced by onValidationError (already the intended error type).
      // Only errors from exotic property access (non-Error throws are possible) fall through.
      if (error instanceof Error) {
        throw error;
      }
      this.onValidationError(`${name} must have a ${method} method`);
    }
  }

  public static assertFunctionOrObjectWithMethod(val: unknown, method: string, name: string): void {
    if (val === undefined || val === null) {
      return;
    }
    if (typeof val === 'function') {
      return;
    }
    if (typeof val === 'object') {
      try {
        if (method in val && typeof (val as Record<string, unknown>)[method] === 'function') {
          return;
        }
      } catch {
        // Intentionally ignore errors during property access on exotic objects
      }
    }
    this.onValidationError(`${name} must be a function or an object with a ${method} method`);
  }

  public static assertNoUnknownKeys(config: Record<string, unknown>, knownKeys: Set<string>): void {
    for (const key of Object.keys(config)) {
      if (!knownKeys.has(key)) {
        this.onValidationError(`Unknown configuration key: ${key}`);
      }
    }
  }
}
