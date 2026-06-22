/**
 * Error thrown when building a timing event fails validation.
 *
 * @public
 *
 * @example
 * ```typescript
 * try {
 *   TimingEvent.create().build(); // Missing required fields
 * } catch (error) {
 *   if (error instanceof TimingBuildError) {
 *     console.error('Build failed:', error.message);
 *   }
 * }
 * ```
 */
export class TimingBuildError extends Error {
  /**
   * Creates a new TimingBuildError.
   * @param message - Description of the build validation failure
   */
  constructor(message: string) {
    super(message);
    this.name = 'TimingBuildError';

    if ('captureStackTrace' in Error) {
      Error.captureStackTrace(this, TimingBuildError);
    }
  }
}
