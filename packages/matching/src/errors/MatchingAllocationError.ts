import { BaseError } from '#runtime';

/**
 * Thrown when a scorer cannot allocate the working memory an input pair requires.
 * The platform error is the `cause`.
 * Code: `'matching.allocationFailed'`.
 */
export class MatchingAllocationError extends BaseError {
  public override readonly name: string = 'MatchingAllocationError';

  public constructor(message: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'matching.allocationFailed',
      'message': message,
      'retryable': false
    });
  }
}
