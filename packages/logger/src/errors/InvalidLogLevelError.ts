import { LoggerError } from './LoggerError.js';

/**
 * Thrown when an invalid log level is provided
 *
 * Ensures type safety for log level operations by rejecting
 * unrecognized or malformed log level values.
 *
 * @example
 * ```typescript
 * const level = 'invalid';
 * if (!isValidLogLevel(level)) {
 *   throw new InvalidLogLevelError(`Invalid log level: ${level}`);
 * }
 * ```
 */
export class InvalidLogLevelError extends LoggerError {
  public override readonly name = 'InvalidLogLevelError';

  /**
   * Creates a new InvalidLogLevelError
   *
   * @param message - Descriptive error message
   * @param cause - Optional underlying error that caused this error
   */
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    Error.captureStackTrace(this, this.constructor);
  }
}
