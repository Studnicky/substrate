/**
 * Error thrown when a log builder fails validation.
 *
 * Thrown when required fields are missing from LogBody or LogError builders.
 *
 * @example
 * ```typescript
 * throw new LogBuildError('LogBody: component is required');
 * ```
 */
export class LogBuildError extends Error {
  /**
   * Creates a new LogBuildError
   *
   * @param message - Descriptive error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'LogBuildError';
    Error.captureStackTrace(this, this.constructor);
  }
}
