import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

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
export class TimingBuildError extends BaseError {
  /** Fixed error code for all timing build failures. */
  public static readonly errorCode = 'timing.buildFailed';

  /**
   * Creates a new TimingBuildError.
   * @param message - Description of the build validation failure
   * @param cause   - Optional underlying cause
   */
  public static create(message: string, cause?: unknown): TimingBuildError {
    const result = new TimingBuildError({ 'cause': cause, 'code': TimingBuildError.errorCode, 'message': message, 'retryable': false });
    return result;
  }

  protected constructor(args: Readonly<BaseErrorArgumentsType>) {
    super(args);
  }
}
