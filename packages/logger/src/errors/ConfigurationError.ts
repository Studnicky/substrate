import { LoggerError } from './LoggerError.js';

/**
 * Error thrown when logger configuration is invalid
 *
 * Used for type validation and configuration errors during initialization.
 *
 * @example
 * ```typescript
 * if (typeof config.level !== 'string' && typeof config.level !== 'number') {
 *   throw new ConfigurationError('level must be a string or number');
 * }
 * ```
 */
export class ConfigurationError<TCause = unknown> extends LoggerError<TCause> {
  /**
   * Creates a new ConfigurationError
   *
   * @param message - Descriptive error message
   * @param cause - Optional underlying error that caused this error
   */
  constructor(message: string, cause?: TCause) {
    super(message, cause);
  }
}
