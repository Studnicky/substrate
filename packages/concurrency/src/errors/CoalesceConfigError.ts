/**
 * Concrete error for invalid `Coalesce` configuration.
 *
 * @module
 */
import { ConcurrencyError } from './ConcurrencyError.js';

/** Thrown when `Coalesce` is constructed with invalid options. */
export class CoalesceConfigError extends ConcurrencyError {
  public constructor(message: string, cause?: Error) {
    super({ 'cause': cause, 'code': 'concurrency.invalidConfig', 'message': message, 'retryable': false });
  }
}
