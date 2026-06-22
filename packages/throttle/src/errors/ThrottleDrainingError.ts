/**
 * Error thrown when operations are rejected during throttle drain
 *
 * Thrown by Throttle when attempting to execute a new operation after
 * drain() has been called. Draining mode rejects new operations while
 * allowing in-flight operations to complete.
 */
export class ThrottleDrainingError extends Error {
  /**
   * Create a ThrottleDrainingError
   *
   * @param message - Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'ThrottleDrainingError';
    Error.captureStackTrace(this, ThrottleDrainingError);
  }
}
