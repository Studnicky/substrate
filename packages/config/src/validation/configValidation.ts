/**
 * Configuration validation utilities.
 *
 * Static assertion methods for validating configuration options.
 * All methods skip validation if value is undefined or null.
 * All methods throw (via `onValidationError`) on validation failure.
 *
 * Subclass and `static override onValidationError` to change the thrown error type.
 */
import { Guard } from '@studnicky/types';

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

  /** Shared undefined/null skip guard used by every assert method. */
  private static isSkippable(value: unknown): value is undefined | null {
    const result = value === undefined || value === null;
    return result;
  }

  /**
   * Returns whether `value` exposes `method` as a callable own/inherited property.
   * Property access on exotic objects (proxies, throwing getters) may throw —
   * callers are responsible for deciding how to handle that.
   */
  private static hasCallableMethod(value: object, method: string): boolean {
    if (!(method in value)) { return false; }
    const result = typeof Reflect.get(value, method) === 'function';
    return result;
  }

  public static assertString(value: unknown, name: string): void {
    if (this.isSkippable(value)) {
      return;
    }
    if (!Guard.isString(value)) {
      this.onValidationError(`${name} must be a string`);
    }
  }

  public static assertNumber(value: unknown, name: string): void {
    if (this.isSkippable(value)) {
      return;
    }
    if (!Guard.isNumber(value)) {
      this.onValidationError(`${name} must be a number`);
    }
  }

  public static assertBoolean(value: unknown, name: string): void {
    if (this.isSkippable(value)) {
      return;
    }
    if (!Guard.isBoolean(value)) {
      this.onValidationError(`${name} must be a boolean`);
    }
  }

  public static assertFunction(value: unknown, name: string): void {
    if (this.isSkippable(value)) {
      return;
    }
    if (!Guard.isFunction(value)) {
      this.onValidationError(`${name} must be a function`);
    }
  }

  /**
   * Assert number is an integer.
   * Assumes assertNumber has already passed.
   */
  public static assertInteger(value: unknown, name: string): void {
    if (this.isSkippable(value)) {
      return;
    }
    if (!Number.isInteger(value)) {
      this.onValidationError(`${name} must be an integer`);
    }
  }

  /**
   * Assert number is finite (not Infinity or -Infinity).
   * Assumes assertNumber has already passed.
   */
  public static assertFinite(value: unknown, name: string): void {
    if (this.isSkippable(value)) {
      return;
    }
    if (!Number.isFinite(value)) {
      this.onValidationError(`${name} must be finite`);
    }
  }

  /**
   * Assert number is non-negative (>= 0).
   * Assumes assertNumber has already passed.
   */
  public static assertNonNegative(value: unknown, name: string): void {
    if (this.isSkippable(value) || typeof value !== 'number') {
      return;
    }
    if (value < 0) {
      this.onValidationError(`${name} must be non-negative`);
    }
  }

  /**
   * Assert number is positive (> 0).
   * Assumes assertNumber has already passed.
   */
  public static assertPositive(value: unknown, name: string): void {
    if (this.isSkippable(value) || typeof value !== 'number') {
      return;
    }
    if (value <= 0) {
      this.onValidationError(`${name} must be positive`);
    }
  }

  /**
   * Assert number is at least the minimum value.
   * Assumes assertNumber has already passed.
   */
  public static assertMinimum(value: unknown, minimum: number, name: string): void {
    if (this.isSkippable(value) || typeof value !== 'number') {
      return;
    }
    if (value < minimum) {
      this.onValidationError(`${name} must be at least ${minimum}`);
    }
  }

  /**
   * Assert number is positive or Infinity.
   * Assumes assertNumber has already passed.
   */
  public static assertPositiveOrInfinity(value: unknown, name: string): void {
    if (this.isSkippable(value) || typeof value !== 'number') {
      return;
    }
    if (value !== Infinity && value <= 0) {
      this.onValidationError(`${name} must be positive or Infinity`);
    }
  }

  public static assertHasMethod(value: unknown, method: string, name: string): void {
    if (this.isSkippable(value)) {
      return;
    }
    if (!Guard.isObject(value)) {
      this.onValidationError(`${name} must be an object`);
      return;
    }
    try {
      if (!this.hasCallableMethod(value, method)) {
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

  public static assertFunctionOrObjectWithMethod(value: unknown, method: string, name: string): void {
    if (this.isSkippable(value)) {
      return;
    }
    if (Guard.isFunction(value)) {
      return;
    }
    if (Guard.isObject(value)) {
      try {
        if (this.hasCallableMethod(value, method)) {
          return;
        }
      } catch (error) {
        // Re-throw errors produced by onValidationError (already the intended error type).
        // Only errors from exotic property access (non-Error throws are possible) fall through.
        if (error instanceof Error) {
          throw error;
        }
        this.onValidationError(`${name} must be a function or an object with a ${method} method`);
      }
    }
    this.onValidationError(`${name} must be a function or an object with a ${method} method`);
  }

  public static assertNoUnknownKeys(config: Record<string, unknown>, knownKeys: Set<string>): void {
    const keys = Object.keys(config);
    const length = keys.length;
    for (let index = 0; index < length; index += 1) {
      const key = keys[index];
      if (key === undefined) {
        continue;
      }
      if (!knownKeys.has(key)) {
        this.onValidationError(`Unknown configuration key: ${key}`);
      }
    }
  }
}
