/**
 * Concrete error for the `@studnicky/signal` package.
 *
 * @module
 */
import { BaseError } from '@studnicky/errors';

/** Thrown when `Signal#compose()` receives invalid configuration (e.g. negative `deadlineMs`). */
export class SignalError extends BaseError {
  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'signal.invalidConfig', 'message': message, 'retryable': false });
  }
}
