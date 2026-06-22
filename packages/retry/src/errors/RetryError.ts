import { EMPTY_LENGTH } from '../constants/index.js';

/**
 * Base error class for all retry-related failures
 *
 * Extended by MaxRetriesExceededError and NonRetryableError.
 * Provides common properties for tracking attempt count and error history.
 */
export class RetryError extends Error {
  public readonly attempts: number;
  public override readonly cause?: Error | undefined;
  public readonly errors: Error[];

  /**
   * Create a RetryError
   *
   * @param message - Error message
   * @param attempts - Number of attempts made
   * @param cause - The underlying error that caused failure
   * @param errors - All errors from each attempt
   */
  constructor(
    message: string,
    attempts: number,
    cause?: Error,
    errors: Error[] = []
  ) {
    super(message, cause !== undefined ? { 'cause': cause } : undefined);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.cause = cause;

    if (errors.length > EMPTY_LENGTH) {
      this.errors = errors;
    } else if (cause) {
      this.errors = [cause];
    } else {
      this.errors = [];
    }

    Error.captureStackTrace(this, RetryError);
  }
}
