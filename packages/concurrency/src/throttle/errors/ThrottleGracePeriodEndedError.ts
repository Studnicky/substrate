import { BaseError } from '#runtime';

/**
 * Abort reason for the grace-period timer of `Throttle.abort()`.
 *
 * The timer is cancelled with this reason when in-flight operations finish before the grace
 * period elapses.
 */
export class ThrottleGracePeriodEndedError extends BaseError {
  public override readonly name: string = 'ThrottleGracePeriodEndedError';

  /**
   * The grace period in milliseconds that was configured for the abort
   */
  public readonly timeoutMs: number;

  /**
   * Create a ThrottleGracePeriodEndedError
   *
   * @param timeoutMs - The grace period in milliseconds
   */
  constructor(timeoutMs: number) {
    super({ 'code': 'throttle.gracePeriodEnded', 'message': 'In-flight operations finished before the abort grace period elapsed.', 'retryable': false });
    this.timeoutMs = timeoutMs;
  }
}
