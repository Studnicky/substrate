import { LoggerError } from './LoggerError.js';

/**
 * Error thrown when log-entry configuration fails validation.
 *
 * Thrown when required fields are missing from `LogBody.create()` or `LogFault.create()`.
 *
 * @example
 * ```typescript
 * throw new LogBuildError('LogBody: component is required');
 * ```
 */
export class LogBuildError extends LoggerError {
  public override readonly name: string = 'LogBuildError';

  /**
   * Creates a new LogBuildError
   *
   * @param message - Descriptive error message
   * @param cause - Optional underlying error
   */
  constructor(message: string, cause?: unknown) {
    super(message, cause);
  }
}
