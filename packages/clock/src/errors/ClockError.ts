/**
 * Concrete error for the `@studnicky/clock` package.
 *
 * @module
 */
import { BaseError } from '@studnicky/errors/browser';

/** Thrown when clock configuration is invalid (e.g. non-finite `offsetMs`). */
export class ClockError extends BaseError {
  public override readonly name: string = 'ClockError';

  public constructor(message: string, cause?: Error) {
    super({ 'cause': cause, 'code': 'clock.invalidConfig', 'message': message, 'retryable': false });
  }
}
