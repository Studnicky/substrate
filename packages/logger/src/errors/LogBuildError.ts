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
  /**
   * Creates a new LogBuildError
   *
   * @param message - Descriptive error message
   */
  constructor(message: string) {
    super(message);
  }
}
