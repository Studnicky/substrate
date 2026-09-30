import { BaseError } from '@studnicky/types/browser';

/**
 * Thrown when a page or cursor cannot be structured-cloned into the paginator's retained state.
 * The platform error is the `cause`.
 * Code: `'paginator.valueNotCloneable'`.
 */
export class PaginatorCloneError extends BaseError {
  public override readonly name: string = 'PaginatorCloneError';

  public constructor(message: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'paginator.valueNotCloneable',
      'message': message,
      'retryable': false
    });
  }
}
