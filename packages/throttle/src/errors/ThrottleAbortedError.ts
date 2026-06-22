/**
 * Error thrown when a throttled operation is aborted
 *
 * Thrown by Throttle when an operation exceeds the configured abort timeout
 * or when the throttle is forcefully aborted via the abort() method.
 */
export class ThrottleAbortedError extends Error {
  /**
   * Create a ThrottleAbortedError
   *
   * @param message - Error message
   * @param timeoutMs - The abort timeout value in milliseconds
   */
  constructor(
    message: string,
    public readonly timeoutMs: number
  ) {
    super(message);
    this.name = 'ThrottleAbortedError';
    Error.captureStackTrace(this, ThrottleAbortedError);
  }
}
