/**
 * Concrete error for the `@studnicky/clock` package.
 *
 * @module
 */
import { BaseError } from '@studnicky/errors';

/** Thrown when clock configuration is invalid (e.g. non-finite `offsetMs`). */
export class ClockError extends BaseError {
  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'clock.invalidConfig', 'message': message, 'retryable': false });
  }
}
