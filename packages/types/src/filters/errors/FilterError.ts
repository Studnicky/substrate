/**
 * @module FilterError
 * @description Base class for all FilterEngine errors
 */

/**
 * Base class for all FilterEngine errors
 * Follows MDN Error specification with proper prototype chain and stack traces
 */
export class FilterError extends Error {
  public override readonly cause: Error | null;
  public readonly code: string | null;

  /**
   * Creates a FilterError
   */
  constructor(message: string, code?: string, cause?: Error) {
    super(message);

    // Set the name to the constructor name
    // Handle case where constructor might be null (edge case in tests)
    this.name = this.constructor?.name || 'FilterError';

    // Initialize all properties in constructor for V8 optimization (maintaining hidden classes)
    // Direct property assignment instead of Object.defineProperty for V8 optimization
    // Make message enumerable for JSON serialization (preserve value from super())
    Object.defineProperty(this, 'message', {
      'configurable': true,
      'enumerable': true,
      'value': this.message,
      'writable': true
    });

    // Handle code parameter - convert only undefined to null, preserve everything else
    this.code = code === undefined ? null : code;

    // Handle cause parameter - convert only undefined to null, preserve everything else
    this.cause = cause === undefined ? null : cause;

    // Capture stack trace, excluding constructor call from stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor || FilterError);
    }
  }

  static {
    // Ensure proper prototype chain
    this.prototype.constructor = this;
  }
}
