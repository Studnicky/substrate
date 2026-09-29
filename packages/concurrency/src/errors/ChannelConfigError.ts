/**
 * Concrete error for invalid `Channel` configuration.
 *
 * @module
 */
import { ConcurrencyError } from './ConcurrencyError.js';

/** Thrown when `Channel` is constructed with invalid options. */
export class ChannelConfigError extends ConcurrencyError {
  public override readonly name: string = 'ChannelConfigError';

  public constructor(message: string, cause?: Error) {
    super({ 'cause': cause, 'code': 'concurrency.invalidConfig', 'message': message, 'retryable': false });
  }
}
