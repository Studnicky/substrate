import { BaseError } from '@studnicky/types/browser';

/**
 * Error thrown when a throttle permit acquisition fails with a value that is not a `BaseError`.
 *
 * The originating value is preserved as `cause`.
 */
export class ThrottleAcquisitionError extends BaseError {
  public override readonly name: string = 'ThrottleAcquisitionError';

  /**
   * Create a ThrottleAcquisitionError
   *
   * @param message - Error message
   * @param cause - The value the semaphore acquisition failed with
   */
  constructor(message: string, cause: unknown) {
    super({ 'cause': cause, 'code': 'throttle.acquisitionFailed', 'message': message, 'retryable': false });
  }
}
