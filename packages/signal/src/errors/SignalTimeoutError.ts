import { BaseError } from '#runtime';
/**
 * Abort reason for a deadline composed by `Signal#compose()`.
 *
 * @module
 */

/** The `AbortSignal.reason` of a composed signal whose `deadlineMs` elapsed. */
export class SignalTimeoutError extends BaseError {
  public override readonly name: string = 'SignalTimeoutError';

  public readonly deadlineMs: number;

  public constructor(deadlineMs: number) {
    super({ 'code': 'signal.timeout', 'message': `The operation was aborted after the ${deadlineMs}ms deadline elapsed.`, 'retryable': true });
    this.deadlineMs = deadlineMs;
  }
}
