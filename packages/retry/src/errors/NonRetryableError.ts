import { RetryError } from './RetryError.js';

/**
 * Error thrown when operation fails with a non-retryable error
 *
 * Thrown by Retry when the error classifier determines that an error
 * should not be retried (e.g., 4xx HTTP errors, validation failures).
 * Contains the original error and classification reason.
 */
export class NonRetryableError extends RetryError {
  /**
   * Create a NonRetryableError
   *
   * @param message - Error description
   * @param originalError - The error classified as non-retryable
   * @param reason - Reason for non-retryability
   * @param attempts - Number of attempts made before classification
   */
  constructor(
    message: string,
    public readonly originalError: Error,
    public readonly reason: string,
    attempts: number
  ) {
    super(message, attempts, { 'cause': originalError, 'code': 'retry.nonRetryable', 'errors': [] });
  }
}
