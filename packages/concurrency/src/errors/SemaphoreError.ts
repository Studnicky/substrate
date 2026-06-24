/**
 * Concrete error for invalid `Semaphore` configuration.
 *
 * @module
 */
import { ConcurrencyError } from './ConcurrencyError.js';

/** Thrown when `Semaphore` is constructed with an invalid permit count. */
export class SemaphoreError extends ConcurrencyError {
  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'concurrency.invalidPermits', 'message': message, 'retryable': false });
  }
}
