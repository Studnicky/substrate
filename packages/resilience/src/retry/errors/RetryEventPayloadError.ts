import { BaseError } from '@studnicky/types/browser';

/**
 * Thrown when a retry lifecycle event payload cannot be structured-cloned for publishing.
 * The platform error is the `cause`.
 * Code: `'retry.eventPayloadNotCloneable'`.
 */
export class RetryEventPayloadError extends BaseError {
  public override readonly name: string = 'RetryEventPayloadError';

  public constructor(message: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'retry.eventPayloadNotCloneable',
      'message': message,
      'retryable': false
    });
  }
}
