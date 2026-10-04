/**
 * Concrete error for the `@studnicky/clock` package.
 *
 * @module
 */
import { BaseError } from '@studnicky/types/browser';

/** Thrown when a host timer reading cannot be converted to integer nanoseconds. */
export class ClockConversionError extends BaseError {
  public override readonly name: string = 'ClockConversionError';

  public constructor(message: string, cause?: unknown) {
    super({ 'cause': cause, 'code': 'clock.conversionFailed', 'message': message, 'retryable': false });
  }
}
