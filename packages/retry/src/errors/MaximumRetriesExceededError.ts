import { RuntimeError } from '@studnicky/errors';

import { LAST_ARRAY_INDEX } from '../constants/index.js';
import { RetryError } from './RetryError.js';

/**
 * Error thrown when maximum retry attempts are exhausted
 *
 * Thrown by Retry when an operation fails on all attempts including the
 * initial attempt plus all configured retries. Contains the complete
 * error history from each attempt.
 */
export class MaximumRetriesExceededError extends RetryError {
  public readonly maximumRetries: number;

  /**
   * Create a MaximumRetriesExceededError
   *
   * @param message - Error description
   * @param maximumRetries - Maximum retries configured
   * @param attempts - Total attempts made (maximumRetries + 1)
   * @param errors - All errors from each attempt
   */
  constructor(
    message: string,
    maximumRetries: number,
    attempts: number,
    errors: readonly Error[]
  ) {
    const cause = errors.at(LAST_ARRAY_INDEX) ?? RuntimeError.create('Unknown error');

    super(message, attempts, { 'cause': cause, 'code': 'retry.maxRetriesExceeded', 'errors': errors });
    this.maximumRetries = maximumRetries;
  }
}
