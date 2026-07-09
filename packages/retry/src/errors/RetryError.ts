import { BaseError } from '@studnicky/errors';

import type { RetryErrorOptionsType } from '../types/RetryErrorOptionsType.js';

import { EMPTY_LENGTH } from '../constants/index.js';

/**
 * Base error class for all retry-related failures
 *
 * Extended by MaxRetriesExceededError and NonRetryableError.
 * Provides common properties for tracking attempt count and error history.
 */
export class RetryError extends BaseError {
  public readonly attempts: number;
  public readonly errors: Error[];

  /**
   * Create a RetryError
   *
   * @param message - Error message
   * @param attempts - Number of attempts made
   * @param options - Optional cause, errors array, and error code
   */
  constructor(
    message: string,
    attempts: number,
    options?: RetryErrorOptionsType
  ) {
    const cause = options?.cause;
    const code = options?.code ?? 'retry.failed';
    const errors = options?.errors ?? [];
    super({ 'cause': cause, 'code': code, 'message': message, 'retryable': false });
    this.attempts = attempts;

    let errorsArray: Error[];
    if (errors.length > EMPTY_LENGTH) {
      errorsArray = errors;
    } else if (cause !== undefined) {
      errorsArray = [cause];
    } else {
      errorsArray = [];
    }
    this.errors = errorsArray;
  }
}
