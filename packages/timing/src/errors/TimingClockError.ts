import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/types/browser';

/**
 * Error thrown when a host timer reading cannot be converted to nanoseconds.
 *
 * @public
 */
export class TimingClockError extends BaseError {
  public override readonly name: string = 'TimingClockError';

  /** Fixed error code for host timer conversion failures. */
  public static readonly errorCode = 'timing.clockConversionFailed';

  /**
   * Creates a new TimingClockError.
   * @param message - Description of the conversion failure
   * @param cause   - Underlying platform error
   */
  public static create(message: string, cause?: unknown): TimingClockError {
    const result = new TimingClockError({ 'cause': cause, 'code': TimingClockError.errorCode, 'message': message, 'retryable': false });
    return result;
  }

  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}
