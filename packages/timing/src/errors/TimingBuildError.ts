import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/errors';

/**
 * Error thrown when timing event configuration fails validation.
 *
 * @public
 *
 * @example
 * ```typescript
 * try {
 *   TimingEvent.create({ component: 'GraphAdapter', operation: 'query' });
 * } catch (error) {
 *   if (error instanceof TimingBuildError) {
 *     console.error('Configuration failed:', error.message);
 *   }
 * }
 * ```
 */
export class TimingBuildError extends BaseError {
  /** Fixed error code for timing event configuration failures. */
  public static readonly errorCode = 'timing.buildFailed';

  /**
   * Creates a new TimingBuildError.
   * @param message - Description of the configuration validation failure
   * @param cause   - Optional underlying cause
   */
  public static create(message: string, cause?: unknown): TimingBuildError {
    const result = new TimingBuildError({ 'cause': cause, 'code': TimingBuildError.errorCode, 'message': message, 'retryable': false });
    return result;
  }

  protected constructor(args: Readonly<BaseErrorArgumentsInterface>) {
    super(args);
  }
}
