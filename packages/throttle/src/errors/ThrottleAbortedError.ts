import { BaseError } from '@studnicky/errors';

/**
 * Error thrown when a throttled operation is aborted
 *
 * Thrown by Throttle when an operation exceeds the configured abort timeout
 * or when the throttle is forcefully aborted via the abort() method.
 */
export class ThrottleAbortedError extends BaseError {
  /**
   * The abort timeout value in milliseconds
   */
  public readonly timeoutMs: number;

  /**
   * Create a ThrottleAbortedError
   *
   * @param message - Error message
   * @param timeoutMs - The abort timeout value in milliseconds
   */
  constructor(message: string, timeoutMs: number) {
    super({ 'code': 'throttle.aborted', 'message': message, 'retryable': false });
    this.timeoutMs = timeoutMs;
  }
}
