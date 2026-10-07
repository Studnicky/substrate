import { BaseError } from '#runtime';
/**
 * Concrete error for the `@studnicky/signal` package.
 *
 * @module
 */

/** Thrown when `Signal#compose()` receives invalid configuration (e.g. negative `deadlineMs`). */
export class SignalError extends BaseError {
  public override readonly name: string = 'SignalError';

  public constructor(message: string, cause?: Error) {
    super({ 'cause': cause, 'code': 'signal.invalidConfig', 'message': message, 'retryable': false });
  }
}
