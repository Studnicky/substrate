/**
 * Base error class for all logger-related errors
 *
 * Provides consistent error handling with optional cause tracking.
 * All logger-specific error classes extend this base class.
 *
 * @example
 * ```typescript
 * throw new LoggerError('Failed to initialize logger');
 * throw new LoggerError('Failed to write log', originalError);
 * ```
 */
export class LoggerError extends Error {
  public override readonly cause?: unknown;

  /**
   * Creates a new LoggerError
   *
   * @param message - Descriptive error message
   * @param cause - Optional underlying error that caused this error
   */
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'LoggerError';
    this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}
